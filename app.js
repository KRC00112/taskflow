const express = require('express');
const app = express();
const port=3000
const amqp = require('amqplib');

const {Pool}=require('pg');
require('dotenv').config();
const pool = new Pool({
    user:process.env.USER,
    host:process.env.HOST,
    database:process.env.DATABASE,
    password:process.env.PASSWORD,
    port:process.env.PORT,
})

let channel;


async function connectQueue() {
    const connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();




    await channel.assertQueue('task_queue', {
        durable: true,
        arguments: {
            'x-queue-type': 'quorum'
        }
    });
    console.log('Connected to RabbitMQ!')
}



connectQueue();

app.use(express.json());

app.get('/', async (req,res)=>{

    try{

        const client =await pool.connect();
        const result=await client.query("SELECT * FROM tasks");
        res.send(result.rows);
        client.release();


    }catch(err){
        console.log(err);
        res.send("error: ",err);
    }

})

app.get('/:id', async (req,res)=>{

    try{

        const client =await pool.connect();
        const result=await client.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
        res.send(result.rows);
        client.release();


    }catch(err){
        console.log(err);
        res.send("error: ",err);
    }

})


app.post('/', async (req,res)=>{

    try {
        const client = await pool.connect();
        const results=await client.query("INSERT INTO tasks (title) VALUES ($1) RETURNING *", [req.body.title]);
        const task = results.rows[0];
        client.release();
        channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(task)),{
            persistent: true,
        });
        console.log(`[X] Task published to queue: ${task.id}`);
        res.send(task)
    }catch(err){
        console.log(err);
        res.send("Error: ",err)
    }


})


app.listen(port,()=>{
    console.log(`Server started on port ${port}`);
})

process.on('SIGINT', () => {
    pool.end()
    process.exit()
})
