# Contextual Ads AI Chatbot

An AI chatbot that generates answers and matches semantically relevant sponsored content against both the user's query and the AI's response.

**[Live demo](#)** *(link will be added after deployment)*

## What makes this interesting

Most ad systems match sponsored content against a keyword or a query. That fails for AI chat, because what matters is whether the ad is relevant to *the answer*, not just the question.

This project uses a two-stage matching pipeline:

1. **Candidate retrieval** — when the user sends a message, we embed it with a local MiniLM model and fetch the top 30 ad candidates by cosine similarity. This runs in parallel with the LLM stream, so it adds no latency.
2. **Answer-aware re-ranking** — after the LLM finishes generating, we embed the full answer and re-score every candidate against both the query and the answer. Ads must clear a relevance gate to be shown at all — high bidders can't pay their way past irrelevance.

The top 2 matching ads are streamed to the client as a final SSE event and displayed as sponsored cards below the response. Every placement is logged with its query similarity, answer similarity, and score for later CTR analysis.

## Architecture
