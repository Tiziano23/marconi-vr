"use strict";
class Notifier {
	constructor(id){
		this.container = document.getElementById(id);
	}
	notify(msg){
		let el = document.createElement('p');
		el.innerHTML = msg;
		el.classList.add('notification','visible');
		this.container.appendChild(el);
		
		setTimeout(() => {
			el.classList.replace('visible','hidden');
			setTimeout(() => {
				this.container.removeChild(el);
			},500);
		},2000);
	}
}
let notifier = new Notifier('notifications');