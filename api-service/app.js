const express = require('express');
const app = express();
const port=3000
const amqp = require('amqplib');
const logger = require('./logger');

const {Pool}=require('pg');
require('dotenv').config();
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
})

let channel;

async function connectQueue() {
    const connection = await amqp.connect('amqp://rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('task_queue', {
        durable: true,
        arguments: {
            'x-queue-type': 'quorum'
        }
    });
    logger.info('Connected to RabbitMQ');
}

connectQueue();

app.use(express.json());

app.get('/', async (req,res)=>{
    try{
        const client = await pool.connect();
        const result = await client.query("SELECT * FROM tasks");
        res.send(result.rows);
        client.release();
    }catch(err){
        logger.error('Failed to get tasks', { error: err.message });
        res.send("error: ", err);
    }
})

app.get('/metrics', async (req, res) => {
    try {
        const client = await pool.connect();

        const total = await client.query("SELECT COUNT(*) FROM tasks");
        const pending = await client.query("SELECT COUNT(*) FROM tasks WHERE status='pending'");
        const processing = await client.query("SELECT COUNT(*) FROM tasks WHERE status='processing'");
        const done = await client.query("SELECT COUNT(*) FROM tasks WHERE status='done'");

        client.release();

        res.json({
            tasks_total: parseInt(total.rows[0].count),
            tasks_pending: parseInt(pending.rows[0].count),
            tasks_processing: parseInt(processing.rows[0].count),
            tasks_done: parseInt(done.rows[0].count),
        });
    } catch (err) {
        logger.error('Failed to get metrics', { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

app.get('/:id', async (req,res)=>{
    try{
        const client = await pool.connect();
        const result = await client.query("SELECT * FROM tasks WHERE id=$1",[req.params.id]);
        res.send(result.rows);
        client.release();
    }catch(err){
        logger.error('Failed to get task', { error: err.message });
        res.send("error: ", err);
    }
})



app.post('/', async (req,res)=>{
    try {
        const client = await pool.connect();
        const results = await client.query("INSERT INTO tasks (title) VALUES ($1) RETURNING *", [req.body.title]);
        const task = results.rows[0];
        client.release();
        channel.sendToQueue('task_queue', Buffer.from(JSON.stringify(task)),{
            persistent: true,
        });
        logger.info('Task published to queue', { task_id: task.id, title: task.title });
        res.send(task)
    }catch(err){
        logger.error('Failed to create task', { error: err.message });
        res.send("Error: ", err)
    }
})



app.listen(port,()=>{
    logger.info('Server started', { port });
})

process.on('SIGINT', () => {
    pool.end()
    process.exit()
})