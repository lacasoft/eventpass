import cluster from 'cluster';
import { cpus } from 'os';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers
  const workers = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS, 10) : numCPUs;

  for (let i = 0; i < workers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker...');
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  void import('./main.js');
  console.log(`Worker ${process.pid} started`);
}
