const amqp = require('amqplib')

async function main() {

    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'hello'
    const msg = 'Hello World!';

    await channel.assertQueue(queue, {
        durable: true,
        arguments: {
            'x-queue-type': 'quorum'
        }
    });

    channel.sendToQueue(queue, Buffer.from(msg));
    console.log(`[X] sent to ${msg}`);

    setTimeout(() => {
        connection.close();
        process.exit(0);
    }, 500);

}

main();