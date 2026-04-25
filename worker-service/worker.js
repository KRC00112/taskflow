const amqp = require('amqplib');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});


async function main(){

    const connection = await amqp.connect('amqp://rabbitmq');
    const channel = await connection.createChannel();

    const queue = 'task_queue';

    await channel.assertQueue(queue,{
        durable:true,
        arguments:{
            'x-queue-type':'quorum'
        }
    });


    channel.prefetch(1);

    channel.consume(queue,async (msg)=>{
        const task = JSON.parse(msg.content.toString());
        console.log(`[X] Received task: ${task.id} - ${task.title}`);

        await pool.query(
            "UPDATE tasks SET status='processing' WHERE id=$1",
            [task.id]
        );

        await new Promise(resolve => setTimeout(resolve, 10000));

        await pool.query(
            "UPDATE tasks SET status='done' WHERE id=$1",
            [task.id]
        );

        console.log(`[X] Done: ${task.id}`);
        channel.ack(msg);
    },{
        noAck:false,
    });

}

main();