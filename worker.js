const amqp = require('amqplib');

async function main(){

    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'task_queue';

    await channel.assertQueue(queue,{
        durable:true,
        arguments:{
            'x-queue-type':'quorum'
        }
    });

    channel.consume(queue,(msg)=>{

        const secs = msg.content.toString().split('.').length-1;

        console.log(`[X] Received ${msg.content.toString()}`);
        setTimeout(()=>{
            console.log("[X] Done")
        },secs*1000);
    },{
        noAck:true,
    });

}

main();