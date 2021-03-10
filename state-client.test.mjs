import ClientMiddleware from "../zkss-au/js/middleware_client.mjs";
import EventProcessor from "../zkss-au/js/event_processor.mjs";
import Au from "../zkss-au/js/globals.mjs";
import StateLobby from "../zkss-au/js/state_lobby.mjs";
import StateMainMenu from "../zkss-au/js/state_main_menu.mjs";
import StateMeeting from "../zkss-au/js/state_meeting.mjs";
import StatePlaying from "../zkss-au/js/state_playing.mjs";
import StateTask from "../zkss-au/js/state_task.mjs";
import StateViewLog from "../zkss-au/js/state_view_log.mjs";

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
//jquery stub
global.$ = function(){
	return {
		on:function(){},
		attr:function(){return "";},
		prop:function(){},
		is:function(){return false;},
		hide:function(){},
		show:function(){},
		html:function(){},
		text:function(){},
		append:function(){},
		prepend:function(){},
		length:function(){return 0;},
		remove:function(){},
		val:function(){}
	};
};
//alert stub
global.alert = function(msg){
	console.log(msg);
};
global.confirm = function(msg){
	console.log(msg);
	return true;
};
//alert stub
global.document = {
	getElementById:function(){}
};
let setUp = function(){
    Au.states = {};
    Au.states.stateLobby = new StateLobby();
    Au.states.stateMainMenu = new StateMainMenu();
    Au.states.stateMeeting = new StateMeeting();
    Au.states.statePlaying = new StatePlaying();
    Au.states.stateTask = new StateTask();
    Au.states.stateViewLog = new StateViewLog();
	Au.varPlayerId = "5id";
	Au.middleware = new ClientMiddleware();
	Au.processor = new EventProcessor(Au.middleware);
	
	join("1name","1id",Au.processor);
	join("2name","2id",Au.processor);
	join("3name","3id",Au.processor);
	join("4name","4id",Au.processor);
	join("5name","5id",Au.processor);
	start(Au.processor);
	//mock canvas
	let context = {
		clearRect:function(){},
		fillRect:function(){},
		fillText:function(){},
		drawImage:function(){}
	};
	Au.canvas = {
		getContext:function(){return context}
		
	};
	
	for (const state of Object.values(Au.states)) {
	  state.init();
	}
	
};
describe('Client States', function() {
	
	it('Client state test - hide', function() {
		setUp();
		for (const state of Object.values(Au.states)) {
		  state.hide();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	it('Client state test - update', function() {
		setUp();
		for (const state of Object.values(Au.states)) {
		  state.update();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	it('Client state test - render', function() {
		setUp();
		for (const state of Object.values(Au.states)) {
		  state.render();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	it('Client state test - hide (imposter)', function() {
		setUp();
		Au.varPlayerId = "1id";
		for (const state of Object.values(Au.states)) {
		  state.hide();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	it('Client state test - update (imposter)', function() {
		setUp();
		Au.varPlayerId = "1id";
		for (const state of Object.values(Au.states)) {
		  state.update();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	it('Client state test - render (imposter)', function() {
		setUp();
		Au.varPlayerId = "1id";
		for (const state of Object.values(Au.states)) {
		  state.render();
		}
		assert.equal(true,true);//just assert no error was thrown
	});
	
	
	//-- state playing has doAction method to test	
	it('Client state test - doAction (imposter)', function() {
		setUp();
		Au.varPlayerId = "1id";
		Au.state  =Au.states.statePlaying;
		let messageQueue = [];
		Au.sendMessage = function(msg){
			messageQueue.push(JSON.parse(msg));//capture messages for the action
		};
		Au.state.doAction(Au.TASKS.KILL,"A");
		assert.equal(messageQueue.length,1);
		assert.equal(messageQueue[0].kind,Au.EVENTS.KILL);
		messageQueue=[];
		
		Au.state.doAction(Au.TASKS.SABOTAGE,"A");
		assert.equal(messageQueue.length,1);
		assert.equal(messageQueue[0].kind,Au.EVENTS.SABOTAGE);
		messageQueue=[];
		
		Au.state.doAction(Au.TASKS.MEETING);
		assert.equal(messageQueue.length,1);
		assert.equal(messageQueue[0].kind,Au.EVENTS.MEETING);
		messageQueue=[];
		
		Au.state.doAction(Au.TASKS.VIEW_LOG);
		assert.equal(messageQueue.length,0);
		assert.equal(Au.state, Au.states.stateViewLog);
		messageQueue=[];
		
	});
	it('Client state test - doAction (innocent)', function() {
		setUp();
		Au.varPlayerId = "5id";
		Au.state  =Au.states.statePlaying;
		let messageQueue = [];
		Au.sendMessage = function(msg){
			messageQueue.push(JSON.parse(msg));//capture messages for the action
		};
		
		//interact 1: no task started for this player, they are alive
		Au.state.doAction(Au.TASKS.INTERACT,"A");
		assert.equal(messageQueue.length,0);
		messageQueue=[];
		//interact 1: no task started for this player, they are dead
		let modPlayer = Au.middleware.getPlayerByTag("A");
		modPlayer.isAlive = false;
		Au.state.doAction(Au.TASKS.INTERACT,"A");
		assert.equal(messageQueue.length,1);
		assert.equal(messageQueue[0].kind,Au.EVENTS.MEETING);
		messageQueue=[];
		modPlayer.isAlive = true;
		
		
		let tasks = Au.middleware.getTasksForPlayer(Au.varPlayerId);
		let firstTask = tasks[Object.keys(tasks)[0]];
		
		Au.state.doAction(Au.TASKS.TASK,firstTask.name);
		assert.equal(Au.state, Au.states.stateTask);
		Au.state = Au.states.statePlaying;
		
		Au.state.doAction(Au.TASKS.MEETING);
		assert.equal(messageQueue.length,1);
		assert.equal(messageQueue[0].kind,Au.EVENTS.MEETING);
		messageQueue=[];
		
		Au.state.doAction(Au.TASKS.VIEW_LOG);
		assert.equal(messageQueue.length,0);
		assert.equal(Au.state, Au.states.stateViewLog);
		messageQueue=[];
		
		
	});
	
	
	

});