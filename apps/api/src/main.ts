import "dotenv/config";
import express from "express";
import cors from "cors";
import { chatbotRouter } from "./routes/chat";
import { authRouter } from "./routes/auth";
import { db } from "@mindscribe/database";

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/chat", chatbotRouter);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to MindScribe API" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`MindScribe API running on port ${PORT}`);
  console.log(
    `LLM Base URL: ${process.env.LLM_BASE_URL || "http://localhost:8000/v1"}`,
  );
  console.log(`LLM Model: ${process.env.LLM_MODEL || "gpt-3.5-turbo"}`);
});
