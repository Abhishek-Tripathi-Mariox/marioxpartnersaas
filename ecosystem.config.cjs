// PM2 config for a production deployment (EC2 / any VPS).
//   npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
// Never run `npm run dev` on a server: it compiles pages on every visit, uses far more CPU/RAM
// and is what makes pages hang on "loading".
module.exports = {
  apps: [
    {
      name: 'mariox-partners',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      // Sized for a 1 GB instance (t2/t3.micro) that also runs MongoDB: cap the heap and restart
      // cleanly before the kernel's OOM killer does. Raise both on a bigger machine.
      node_args: '--max-old-space-size=384',
      max_memory_restart: '450M',
      time: true,
    },
  ],
};
