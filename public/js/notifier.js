class Notifier {
	constructor(id){
		this.container = document.getElementById(id);
	}
	notify(msg){
		let el = document.createElement('p');
		el.classList.add('notification');
		el.innerHTML = msg;
		this.container.appendChild(el);
		
		setTimeout(() => {
			el.classList.add('visible');
		},10);
		
		setTimeout(() => {
			el.classList.remove('visible');
			setTimeout(() => {
				this.container.removeChild(el);
			},500);
		},2000);
	}
}
let notifier = new Notifier('notifications');