export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  setTimeout(async () => {
    const { startUptimeLoop } = await import("./lib/uptime-runner");
    startUptimeLoop();
  }, 3000);
}
