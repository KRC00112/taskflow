const amqp = require('amqplib');

async function main(){

    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'hello'

    await channel.assertQueue(queue,{
        durable:true,
        arguments:{
            'x-queue-type':'quorum'
        }
    });

    console.log(`[*] Waiting for messages on ${queue}`);

    channel.consume(queue,(msg)=>{
        console.log(`[X] Received ${msg.content.toString()}`);
    },{
        noAck:true,
    });

}

main();