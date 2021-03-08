import ServerMiddleware from "../zkss-au/js/middleware_server.mjs";
import EventProcessor from "../zkss-au/js/event_processor.mjs";
import Au from "../zkss-au/js/globals.mjs";
import assert from 'assert';

let join = function(name,id,processor){
	let joinMessage = {
		kind:Au.EVENTS.JOIN,
		playername:name,
		id:id
	};
	processor.processEvent(JSON.stringify(joinMessage));
};
let start = function(processor){
	let joinMessage = {
		kind:Au.EVENTS.START,
		seed:42//PRNG seed for determinism
	};
	processor.processEvent(JSON.stringify(joinMessage));
};
let clearTask = function(taskId,processor){
	let joinMessage = {
		kind:Au.EVENTS.CLEAR_TASK,
		key:taskId
	};
	processor.processEvent(JSON.stringify(joinMessage));
};
let kill = function(from,target,processor){
	let joinMessage = {
		kind:Au.EVENTS.KILL,
		name:target,
		from:from
	};
	processor.processEvent(JSON.stringify(joinMessage));
};


describe('init', function() {
	it('Eevnt join', function() {
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
	it('Eevnt start', function() {
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
	it('Eevnt clear task', function() {
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
	it('Eevnt kill', function() {
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
				console.log(middleware.internalMessageBuffer);
				assert.equal(middleware.internalMessageBuffer.length,1);
				break;
			}
		}
		//check that the for loop actually ran to completion
		assert.equal(middleware.internalMessageBuffer.length,1);
		
		
		
		
	});
	
	
	
	

});