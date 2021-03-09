import ServerMiddleware from "../zkss-au/js/middleware_server.mjs";
import EventProcessor from "../zkss-au/js/event_processor.mjs";
import Au from "../zkss-au/js/globals.mjs";
import assert from 'assert';

let join = function(name,id,processor){
	let message = {
		kind:Au.EVENTS.JOIN,
		playername:name,
		id:id
	};
	processor.processEvent(JSON.stringify(message));
};
let start = function(processor){
	let message = {
		kind:Au.EVENTS.START,
		seed:42//PRNG seed for determinism
	};
	processor.processEvent(JSON.stringify(message));
};
let clearTask = function(taskId,processor){
	let message = {
		kind:Au.EVENTS.CLEAR_TASK,
		key:taskId
	};
	processor.processEvent(JSON.stringify(message));
};
let kill = function(from,target,processor){
	let message = {
		kind:Au.EVENTS.KILL,
		name:target,
		from:from
	};
	processor.processEvent(JSON.stringify(message));
};
let meeting = function(host,processor){
	let message = {
		kind:Au.EVENTS.MEETING,
		host:host
	};
	processor.processEvent(JSON.stringify(message));
};
let vote = function(from,voteFor,processor){
	let message = {
	   kind:Au.EVENTS.VOTE,
	   from:from,
	   name:voteFor
   };
   processor.processEvent(JSON.stringify(message));
};


describe('Server Event Processor', function() {
	
	it('Server Eevnt join', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		
		let players = Object.keys(middleware.getAllPlayers());
		assert.equal(players.length, 0);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		//message from "join" click
		players = Object.keys(middleware.getAllPlayers());
		assert.equal(5,players.length);
	});
	it('Server Eevnt start', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		start(processor);
		
		let tasks = Object.keys(middleware.model.varTasks);
		let players = Object.keys(middleware.getAllPlayers());
		//task count is number of tasks per player x the number of non-imposter players
		assert.equal(tasks.length,Au.TASK_NUMBER*players.length -
								  Au.TASK_NUMBER*Au.IMPOSTER_NUMBER);
	});
	it('Server Eevnt clear task', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		start(processor);
		
		assert.equal(middleware.internalMessageBuffer.length,0);
		let tasks = Object.keys(middleware.model.varTasks);
		for(let i=0;i<tasks.length;i+=1){
			let task = tasks[i];
			clearTask(task,processor);
			if(i==tasks.length-1){
				//now should have game over message, all tasks cleared
				assert.equal(middleware.internalMessageBuffer.length,1);
			}else{
				//still no game over message
				assert.equal(middleware.internalMessageBuffer.length,0);
			}
		}
		//check that the for loop actually ran to completion
		assert.equal(middleware.internalMessageBuffer.length,1);
	});
	it('Server Eevnt kill', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		//when calling "start" the imposters are always first
		start(processor);
		
		assert.equal(middleware.internalMessageBuffer.length,0);
		
		let players = middleware.getAllPlayers();
		let playerIds = Object.keys(players);
		let imposter = players[playerIds[0]];
		assert.equal(imposter.isImposter,true);
		//kill players until there's a game over
		let numberAlive = playerIds.length - Au.IMPOSTER_NUMBER;
		for(let i=Au.IMPOSTER_NUMBER;i<playerIds.length;i+=1){
			let player = players[playerIds[i]];
			kill(imposter.id,player.id,processor);
			assert.equal(player.isAlive,false);
			numberAlive-=1;
			if(numberAlive>Au.IMPOSTER_NUMBER){
				//game over should be now
				assert.equal(middleware.internalMessageBuffer.length,0);
			}else{
				//still more players than imposters alive
				assert.equal(middleware.internalMessageBuffer.length,1);
				break;
			}
		}
		//check that the for loop actually ran to completion
		assert.equal(middleware.internalMessageBuffer.length,1);
	});
	it('Server Eevnt meeting', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		start(processor);
		assert.equal(middleware.model.varVotes.length,0);
		middleware.model.varVotes.push("this should be removed");
		assert.equal(middleware.model.varVotes.length,1);
		meeting("1id",processor);
		//TODO: maybe put in a test for meeting timer (currently client-side)
		//assert that calling a meeting clears any previous votes
		assert.equal(middleware.model.varVotes.length,0);
	});
	it('Server Eevnt vote', function() {
		let middleware = new ServerMiddleware();
		let processor = new EventProcessor(middleware);
		let resetVote = function(){
			middleware = new ServerMiddleware();
			processor = new EventProcessor(middleware);
			join("1name","1id",processor);
			join("2name","2id",processor);
			join("3name","3id",processor);
			join("4name","4id",processor);
			join("5name","5id",processor);//odd number of players to test rounding
			//"skip_vote" is a reserved vote keyword
			start(processor);
			meeting("1id",processor);
			//assert player 1 is the imposter, and there's no result yet
			assert.equal(middleware.getPlayer("1id").isImposter,true);
			assert.equal(Au.IMPOSTER_NUMBER,1);
			assert.equal(middleware.internalMessageBuffer.length,0);
		};
		//case 1: clear majority- vote out the imposter
		resetVote();
		vote("1id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","1id",processor);//majority here
		//3 is: voted out, game over (no imposters), game over (innocents voted out imposter)
		assert.equal(middleware.internalMessageBuffer.length,3);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		//--reset and retry
		
		//case 2: clear majority- "skip_vote" 
		resetVote();
		vote("1id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","skip_vote",processor);//majority here
		//1 is: vote result
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.SKIPPED);
		
		//case 3: clear majority- vote out an innocent
		resetVote();
		vote("1id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","5id",processor);//majority here
		//1 is: vote result, but not game over
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		
		//case 4: 2 dead players 
		resetVote();
		kill("1id","2id",processor);
		kill("1id","3id",processor);
		//dead player votes should be blocked client side, but test they are ignored in the tally
		vote("2id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("1id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		//now test that it takes 2 votes from the alive players to vote out the imposter
		vote("4id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","1id",processor);//majority here
		//3 is: voted out, game over (no imposters), game over (innocents voted out imposter)
		assert.equal(middleware.internalMessageBuffer.length,3);
		assert.equal(middleware.internalMessageBuffer[middleware.internalMessageBuffer.length-1].imposterwin,false);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		//case 5: same as above, but vote out innocents
		resetVote();
		kill("1id","2id",processor);
		kill("1id","3id",processor);
		//now test that it takes 2 votes from the alive players to vote out the imposter
		vote("1id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("4id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);//majority here
		//3 is: voted out, game over (no imposters), game over (innocents voted out imposter)
		assert.equal(middleware.internalMessageBuffer.length,3);
		assert.equal(middleware.internalMessageBuffer.length,3);
		assert.equal(middleware.internalMessageBuffer[middleware.internalMessageBuffer.length-1].imposterwin,true);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		
		//case 6: tie
		resetVote();
		kill("1id","2id",processor);//kill 1 player to make the number even
		//now test that it takes 2 votes from the alive players to vote out a player
		vote("4id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("1id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.TIE);
		
		//case 7: no clear majority, keep voting until tie
		resetVote();
		vote("1id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","3id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("4id","4id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.TIE);
		
		//case 8: no clear majority, but 1 person recieves more votes (wait for all votes to be cast)
		resetVote();
		vote("1id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("4id","4id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		
		//case 9: no clear majority, but a tie with skip
		resetVote();
		vote("1id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("4id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.TIE);
		
		//case 10: no clear majority, but skip wins
		resetVote();
		vote("1id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("2id","2id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","3id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("4id","skip_vote",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.SKIPPED);
		
		//case 11: even number of votes, but with 1 leading
		resetVote();
		kill("1id","2id",processor);//kill 1 player to make the number even
		//now test that it takes 2 votes from the alive players to vote out a player
		vote("4id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("1id","1id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("3id","3id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		
		//case 12: even number of votes, with clear majority
		resetVote();
		kill("1id","2id",processor);//kill 1 player to make the number even
		//now test that it takes 2 votes from the alive players to vote out a player
		vote("4id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("5id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,0);
		vote("1id","5id",processor);
		assert.equal(middleware.internalMessageBuffer.length,1);
		assert.equal(middleware.internalMessageBuffer[0].result,middleware.VOTE_RESULTS.PLAYER_VOTED_OUT);
		
		//TODO: what should happen if casting an invalid vote? e.g. alive player votes for dead?
	});
	
	
	

});