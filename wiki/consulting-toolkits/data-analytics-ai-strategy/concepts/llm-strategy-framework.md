---
type: concept
slug: llm-strategy-framework
title: LLM & Generative AI Strategy (Build / Buy / Fine-tune / RAG)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: AI/ML
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# LLM & Generative AI Strategy (Build / Buy / Fine-tune / RAG)

*Category: AI/ML · Toolkit: Data Analytics & AI Strategy*

## What it is
A decision framework that routes each generative AI use case to the right technical approach — cloud API with prompt engineering, RAG, fine-tuning on domain data, or proprietary model — based on data sovereignty needs and required domain specificity.

**Origin:** Synthesised from Andreessen Horowitz 'The New Language Model Stack' (2023), the original RAG paper (Lewis et al., Facebook AI, 2020), and Sequoia Capital 'Generative AI: A Creative New World' (2022). Build/Buy/Fine-tune applied in enterprise AI by McKinsey QuantumBlack and Bain.

## Why it works
The wrong generative AI approach is expensive: companies that fine-tune when a prompt would have sufficed waste months and millions; companies that use a general API for IP-sensitive use cases expose confidential data; companies that build proprietary foundation models for commodity tasks cannot compete with foundation-model labs. The framework routes each use case by assessing two dimensions: data sovereignty (how sensitive is the data) and domain specificity (how much proprietary knowledge does the use case require beyond the public training corpus).

## When to use
In Phase 3 (scoping generative AI use cases) and Phase 5 (choosing the technical approach for each approved use case).

## Visual
`matrix-2x2`

## Step-by-step tutorial
1. For each generative AI use case, score two dimensions: (1) Data sovereignty (1–5): how sensitive is the input data and the outputs? (2) Domain specificity (1–5): how much proprietary knowledge is required beyond the public training corpus?
2. Plot on the matrix and start with Cloud API + prompting for every new use case. Validate on an evaluation set before considering more expensive approaches.
3. For RAG use cases: design the retrieval layer — choose a vector database (Pinecone, Weaviate, pgvector), define document chunking strategy (200–500 tokens with 20% overlap), select the embedding model (text-embedding-3-large), and evaluate retrieval quality (does the retriever return the right context?). Retrieval quality determines 80% of output quality.
4. For fine-tuning decisions: validate on a held-out evaluation set that fine-tuning materially outperforms base model + RAG. Fine-tuning a 7B model costs $5,000–50,000 per run and requires 1,000–10,000 quality labelled examples — only justified when RAG cannot bridge the domain gap.
5. Define responsible AI guardrails before deployment: hallucination detection and citation-grounding, toxicity filtering, PII detection in outputs, human-review step for high-stakes applications.
6. Build a generative AI evaluation framework: groundedness (does output reflect the source?), relevance (does it address the question?), completeness (does it miss important information?). Evaluate before deployment and monthly in production.

## Real-life example — Morgan Stanley
Morgan Stanley deployed an AI assistant for 16,000 financial advisors using GPT-4 with RAG over their 100,000-document research corpus. They chose Cloud API + RAG because: questions from advisors had moderate sensitivity, domain specificity was high (financial research), and RAG over the proprietary corpus solved the knowledge gap without fine-tuning cost. The knowledge base updates daily as new research is published — which fine-tuning cannot do without retraining. Research time per advisor reduced by 40%.

**So what:** RAG over a cloud API solves 80% of enterprise knowledge use cases more cheaply, faster, and with a more updatable knowledge base than fine-tuning. Fine-tune only when a held-out evaluation set proves a material, measurable improvement.

## Template
Complete one row per generative AI use case. Never start with fine-tuning; always validate Cloud API + RAG first.

- [ ] Use case name and business function
- [ ] Data sovereignty score (1–5)
- [ ] Domain specificity score (1–5)
- [ ] Quadrant assignment and recommended approach
- [ ] Evaluation set defined? (Y/N)
- [ ] Estimated build cost (API: low; RAG: $50–200K; fine-tune: $100–500K; build: >$1M)
- [ ] Responsible AI guardrails: hallucination detection / PII detection / toxicity / human review
- [ ] Update frequency requirement (strongly favours RAG over fine-tuning)

## Pitfalls
- Fine-tuning as the default: counter: 80% of enterprise generative AI use cases are better served by RAG + prompt engineering, which is faster, cheaper, and updatable without retraining.
- Ignoring hallucination in production: counter: every generative AI deployment must have citation-grounding before going live. A bot that confidently cites a non-existent regulation is worse than no bot.
- Building RAG retrieval without evaluating retrieval quality: counter: if the retriever does not return the right context, the generator cannot produce the right output. Evaluate retrieval recall@k before evaluating generation quality.
