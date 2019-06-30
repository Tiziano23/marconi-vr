class Streamer {
    constructor(displayId) {
        this.id = null;
        this.name = null;
        this.updater = null;
        this.reciever = null;
        this.controller = null;
        this.clients = [];

        this.searching = false;

        this.display = document.getElementById(displayId);
        this.display.loader = this.display.querySelector('.loader');
        this.display.localID = this.display.querySelector('#local-id');
        this.display.clientList = this.display.querySelector('#client-list');
        this.display.clientListItem = this.display.querySelector('.client-list-item');
        this.display.connectedClient = this.display.querySelector('#connected-client');

        this.display.loader.addEventListener('click',() => {
            if(this.searching)this.stopDiscovery();
            else this.startDiscovery();
        });

        socket.on('unsync',(id) => {
            if(this.reciever)
                if(this.reciever.id == id)
                    this.display.connectedClient.classList.remove('visible');
        })

        setInterval(() => {
            socket.emit('status',data => {this.updateStatus(data)});
        },0);
    }
    
    updateStatus(data){
        this.id = data.id;
        this.name = data.name;
        this.reciever = data.reciever;
        this.controller = data.controller;
        if(this.controller){
            this.display.connectedClient.classList.add('visible');
            this.display.connectedClient.innerHTML = '<i class="fas fa-broadcast-tower"></i>' + this.controller.name + '<span>ID: ' + this.controller.id + '</span>';
            this.display.connectedClient.onclick = () => { this.unsync() }
        } else if(this.reciever){
            this.display.connectedClient.classList.add('visible');
            this.display.connectedClient.innerHTML = '<i class="fas fa-check"></i>' + this.reciever.name + '<span>ID: ' + this.reciever.id + '</span>';
            this.display.connectedClient.onclick = () => { this.syncTo(null) }
        } else {
            this.display.connectedClient.classList.remove('visible');
            this.display.connectedClient.onclick = null;
        }
    }
    updateClientList(info){
        this.display.localID.innerHTML = this.id;
        info.forEach(c => {
            if(c.type == 'add'){
                const el = this.display.clientListItem.cloneNode(true);
                el.id = c.id;
                el.name = c.name;
                el.querySelector('.id').innerHTML = c.id;
                el.querySelector('.name').innerHTML = c.name;
                el.addEventListener('click', e => {
                    this.syncTo(e.target.id);
                });
                this.display.clientList.appendChild(el);
            } else if(c.type == 'remove') {
                const el = this.display.clientList.children[c.id];
                el.style.setProperty('animation','fold-up 0.5s ease');
                setTimeout(() => {
                    this.display.clientList.removeChild(el);
                },500);
            }
        });
    }

    syncTo(id){
        if(id){
            socket.emit('syncTo', id, () => {
                if(this.reciever){
                    this.display.connectedClient.style.setProperty('animation','fade-out-in 0.5s ease');
                    setTimeout(() => { this.display.connectedClient.style.removeProperty('animation')},500);
                }
                this.clients.splice(this.clients.findIndex(x => {return x.id == id}),1);
                this.updateClientList([{id:id,type:'remove'}]);
            });
        } else {
            socket.emit('syncTo', null, () => {
                this.display.connectedClient.classList.remove('visible');
            });
        }
    }
    unsync() {
        socket.emit('unsync', () => {
            this.display.connectedClient.classList.remove('visible');
        });
    }
    
    discover() {
        return new Promise(resolve => {
            socket.emit('getClients', data => {
                const add = data.clients.filter(x => {return !this.clients.find(y => {return y.id == x.id})});
                const remove = this.clients.filter(x => { return !data.clients.find(y => {return y.id == x.id})});                
                this.clients = data.clients;
                add.forEach(x => {x.type = 'add'});
                remove.forEach(x => {x.type = 'remove'});
                resolve([...add,...remove]);
            });
        });
    }
    startDiscovery() {
        this.clients = [];
        this.searching = true;
        this.display.clientList.innerHTML = '';
        this.display.loader.classList.replace('fa-redo-alt','spin');
        this.updater = setInterval(() => {
            this.discover().then(info => {
                this.updateClientList(info);
                if(this.clients.length == 0){
                    this.display.clientList.classList.add('no-clients');
                } else {
                    this.display.clientList.classList.remove('no-clients');
                }
            })
        },250);
    }
    stopDiscovery(){
        clearInterval(this.updater);
        this.updater = null;
        this.searching = false;
        this.display.loader.classList.replace('spin','fa-redo-alt');
    }

    toggleFrame(){
        this.display.classList.toggle('visible');
        if(this.searching)this.stopDiscovery();
        else this.startDiscovery();
    }
    openFrame() {
        this.display.classList.add('visible');
        this.startDiscovery();
    }
    closeFrame() {
        this.display.classList.remove('visible');
        this.stopDiscovery();
    }
}