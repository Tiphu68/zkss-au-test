import ClientMiddleware from "../zkss-au/js/middleware_client.mjs";
import EventProcessor from "../zkss-au/js/event_processor.mjs";
import Au from "../zkss-au/js/globals.mjs";
import StateLobby from "../zkss-au/js/state_lobby.mjs";
import StateMainMenu from "../zkss-au/js/state_main_menu.mjs";
import StateMeeting from "../zkss-au/js/state_meeting.mjs";
import StatePlaying from "../zkss-au/js/state_playing.mjs";
import StateTask from "../zkss-au/js/state_task.mjs";
import StateViewLog from "../zkss-au/js/state_view_log.mjs";

import assert from'assert';

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

//jquery stub
global.$ = function(){
	
	return {
		on:function(){},
		attr:function(){},
		prop:function(){},
		is:function(){},
		hide:function(){},
		show:function(){},
		html:function(){},
		text:function(){},
	};
};
//alert stub
global.alert = function(){};
let setUp = function (){
    Au.states = {};
    Au.states.stateLobby = new StateLobby();
    Au.states.stateMainMenu = new StateMainMenu();
    Au.states.stateMeeting = new StateMeeting();
    Au.states.statePlaying = new StatePlaying();
    Au.states.stateTask = new StateTask();
    Au.states.stateViewLog = new StateViewLog();
	Au.varPlayerId = "5id";
};

describe('Client Event Processor', function() {
	
	it('Client Eevnt join', function() {
		setUp();
		let middleware = new ClientMiddleware();
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
	it('Client Eevnt start', function() {
		setUp();
		let middleware = new ClientMiddleware();
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
		//state set to playing
		assert.equal(Au.state,Au.states.statePlaying);
	});
	it('Client Eevnt clear task', function() {
		setUp();
		let middleware = new ClientMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		start(processor);
		let count = 0;
		let tasks = Object.keys(middleware.model.varTasks);
		for(let i=0;i<tasks.length;i+=1){
			let task = tasks[i];
			assert.equal(middleware.getTask(task).isClear,false);
			clearTask(task,processor);
			assert.equal(middleware.getTask(task).isClear,true);
			count+=1;
		}
		//check that the for loop actually ran to completion
		assert.notEqual(count,0);
	});
	it('Client Eevnt kill', function() {
		setUp();
		let middleware = new ClientMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		//when calling "start" the imposters are always first
		start(processor);
		let count = 0;		
		let players = middleware.getAllPlayers();
		let playerIds = Object.keys(players);
		let imposter = players[playerIds[0]];
		//kill players and check for the change
		//client side treats this event as authoratative so no other checks needed
		let numberAlive = playerIds.length;
		for(let i=0;i<playerIds.length;i+=1){
			let player = players[playerIds[i]];
			assert.equal(player.isAlive,true);
			kill(imposter.id,player.id,processor);
			assert.equal(player.isAlive,false);
			count+=1;
		}
		//check that the for loop actually ran to completion
		assert.notEqual(count,0);
	});
	it('Client Eevnt meeting', function() {
		setUp();
		let middleware = new ClientMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		start(processor);
		assert.equal(middleware.model.varVotes.length,0);
		middleware.model.varVotes.push("this should be removed");
		assert.equal(middleware.model.varVotes.length,1);
		meeting("1id",processor);
		//TODO: maybe put in a test for meeting timer (currently client-side)
		//assert that calling a meeting clears any previous votes
		assert.equal(middleware.model.varVotes.length,0);
		//state set to playing
		assert.equal(Au.state,Au.states.stateMeeting);
	});
	it('Client Eevnt vote', function() {
		setUp();
		let middleware = new ClientMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		//"skip_vote" is a reserved vote keyword
		start(processor);
		meeting("1id",processor);
		//assert that casting a vote causes it to be registered (in theory this can be removed client-side)
		assert.equal(middleware.model.varVotes.length,0);
		vote("1id","skip_vote",processor);
		assert.equal(middleware.model.varVotes.length,1);
		vote("2id","2id",processor);
		assert.equal(middleware.model.varVotes.length,2);
		vote("3id","skip_vote",processor);
		assert.equal(middleware.model.varVotes.length,3);
		vote("4id","2id",processor);
		assert.equal(middleware.model.varVotes.length,4);
		vote("5id","1id",processor);
		assert.equal(middleware.model.varVotes.length,5);
	});

	it('Client Eevnt vote result', function() {
		setUp();
		let middleware = new ClientMiddleware();
		let processor = new EventProcessor(middleware);
		join("1name","1id",processor);
		join("2name","2id",processor);
		join("3name","3id",processor);
		join("4name","4id",processor);
		join("5name","5id",processor);
		start(processor);
		meeting("1id",processor);
		assert.equal(Au.state,Au.states.stateMeeting);
		let voteResultSkip = {
            kind:Au.EVENTS.VOTE_RESULT,
            playerid:"skip_vote",
            result: middleware.VOTE_RESULTS.SKIPPED,
            description:"Nobody voted out: X players skipped voting.",
        };		
		processor.processEvent(JSON.stringify(voteResultSkip));
		assert.equal(Au.state,Au.states.statePlaying);
		meeting("1id",processor);
		assert.equal(Au.state,Au.states.stateMeeting);
		let voteResultTie = {
            kind:Au.EVENTS.VOTE_RESULT,
            playerid:"5id",
            result: middleware.VOTE_RESULTS.TIE,
            description:"Nobody voted out: X players tied for votes.",
        };
		processor.processEvent(JSON.stringify(voteResultTie));
		assert.equal(Au.state,Au.states.statePlaying);
		meeting("1id",processor);
		assert.equal(Au.state,Au.states.stateMeeting);
		//assert that voting out changes the state of that player
		assert.equal(middleware.getPlayer("5id").isAlive,true);
		let voteResultOut = {
            kind:Au.EVENTS.VOTE_RESULT,
            playerid:"5id",
            result: middleware.VOTE_RESULTS.PLAYER_VOTED_OUT,
            description:"Voting out: X",
        };
		processor.processEvent(JSON.stringify(voteResultOut));
		assert.equal(middleware.getPlayer("5id").isAlive,false);
		assert.equal(Au.state,Au.states.statePlaying);
		
		
	});	
	
	

});