import { createIndexes } from "../src/lib/indexes";

async function main() {
  await createIndexes();

  console.log(
    "MongoDB indexes created successfully."
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});