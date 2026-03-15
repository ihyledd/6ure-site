/** PM2 config for the unified Next.js site (port 4000). Use: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "6ure-next",
      script: "node_modules/.bin/next",
      args: "start -p 4000",
      cwd: __dirname,
      node_args: "-r dotenv/config",
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      error_file: "./logs/next-error.log",
      out_file: "./logs/next-out.log",
      merge_logs: true,
      autorestart: true,
    },
  ],
};
