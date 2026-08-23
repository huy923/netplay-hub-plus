export async function check(name: string, assert: () => void | Promise<void>): Promise<void> {
  try {
    await assert();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.log(`  ❌ ${name} → ${msg}`);
    throw err;
  }
}
