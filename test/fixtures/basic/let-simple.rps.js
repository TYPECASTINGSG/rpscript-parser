module.exports = new EventEmitter();
async function main(){
    module.exports.emit('runner.start');

	var $val  = 1 ; 	var $val2  = 'strv' ; 	var $val3  = 1+3 ; 	await api("console-log" , $CONTEXT , {} , 'hello');
	var $val4  = await api("console-log" , $CONTEXT , {} , 'hello') ; 
    module.exports.emit('runner.end');
}

$CONTEXT.event.on ('action', (...params) => {
    let evt = params[2];
    if(evt === 'end') $CONTEXT.$RESULT = params[3];

    module.exports.emit('action',params);
});
setTimeout(main, 100);
