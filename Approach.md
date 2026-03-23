
# Approach Document
## 1. Initial Understanding
At first glance, generating PDFs using Puppeteer appeared to be a straightforward implementation detail. However, after carefully reviewing the constraints and performance characteristics, it became clear that this problem is intentionally designed to evaluate real-world system design trade-offs rather than just implementation ability.

Key challenges emerge from the operational limitations of Puppeteer and the system requirements at scale. For instance, rendering large documents (e.g., PDFs with >500 line items) can lead to frequent crashes due to out-of-memory (OOM) errors. Additionally, each PDF generation process consumes approximately 400MB of memory, which significantly constrains concurrency and necessitates careful resource management.

Beyond resource constraints, the problem also introduces data consistency challenges, particularly in bulk operations where generation can span several minutes. Without proper safeguards, this can result in inconsistencies such as stale data being rendered in later documents of the same batch.

Overall, the problem shifts from a simple “generate PDF” task to a distributed systems challenge, requiring thoughtful handling of:

Resource isolation and concurrency control

Fault tolerance for long-running and failure-prone tasks

Data consistency across asynchronous workflows

User experience under unreliable network conditions.

> problem? What did you think the hard parts were?

One of the primary challenges in this problem is balancing throughput and memory efficiency, a trade-off that is common even in lower-level system design but becomes significantly more critical in distributed systems. Given that each PDF generation consumes ~400MB of memory, maximizing throughput by increasing concurrency can quickly lead to resource exhaustion and system instability. Therefore, the design must carefully regulate concurrency to strike an optimal balance between processing speed and memory usage.

Another key challenge—though less conceptual and more implementation-driven—was working with Puppeteer itself. While it is a powerful tool for HTML-to-PDF rendering, it introduces operational complexities, particularly around memory management and stability. Handling Puppeteer failures for large or complex documents (e.g., >500 line items) requires additional safeguards such as failure detection, retries, and potentially alternative rendering strategies to ensure reliability.

## 2. Assumptions & Clarifying Questions
> List any assumptions you made. In a real scenario, what questions
would you ask the
> product team or engineering lead before starting?

Assumptions -
- Templates are predefined (Handlebars) and controlled internally
- Bulk requests are capped at 100 documents
- SHA-256 hashing is sufficient for tamper evidence (no digital signatures required)

Clarifications -
- Retention period of stored PDFs
- Authentication to access these PDFs
- Is 1000 req/min sustained or peak burst?
- Is hashing sufficient or do we need cryptographic signing?

## 3. Capacity Planning & Math
Given

1000 requests/minute ≈ 16.6 requests/sec

Each PDF:

Takes ~3 seconds

Uses ~400MB memory

To handle 16.6 req/sec:

Concurrency needed = 16.6 × 3 ≈ 50 concurrent jobs

Memory required:
= 50 × 400MB = 20GB RAM

Which is Not feasible within budget

So I decided to limit the parallel workers to 6 (based on memory)
Memory usage:
= 6 × 400MB = 2.4GB

This fits comfortably in a 16GB instance

Throughput with Queue

6 workers → 6 PDFs per 3 seconds

≈ 2 PDFs/sec → 120 PDFs/min

Remaining load is handled via queue buffering

Bulk Request Estimation

Max: 100 PDFs (Assumption)

Processing time:
= (100 / 6) × 3 ≈ 50 seconds

Storage Estimation

Avg PDF size: ~300KB

Monthly volume: 30,000 PDFs

Storage:
= 30,000 × 300KB ≈ 9GB/month

Network Considerations

Bulk ZIP (100 PDFs): ~30MB

Requires resumable downloads (HTTP Range support)

Queue Depth

Peak excess load stored in Redis queue

Ensures system stability instead of failure under bursts

> Consider: memory, CPU, storage, network bandwidth, queue depth.
[Your response here]

## 4. Design Decisions (minimum 3)
Decision 1: Asynchronous Processing via Queue (BullMQ + Redis)

Alternatives considered:

Synchronous HTTP API for both single and bulk PDF generation

Background jobs using database-backed queues (e.g., PostgreSQL)

Chosen approach:
Use a Redis-backed queue (BullMQ) to handle PDF generation asynchronously, decoupling request handling from processing.

Why:

Bulk requests (up to 100 PDFs) can take several minutes, making synchronous APIs impractical due to timeouts and poor user experience

Decoupling allows the API layer to remain responsive while heavy processing is offloaded to worker processes

Built-in retry mechanisms in BullMQ improve fault tolerance for transient failures (e.g., Puppeteer crashes)

Enables controlled concurrency via worker configuration, helping manage memory usage

Tradeoff accepted:

Increased system complexity due to additional infrastructure (Redis + queue management)

Operational overhead in monitoring and maintaining the queue

Decision 2: Chunking Strategy for Large Documents

Alternatives considered:

Increasing memory allocation for workers to handle large PDFs

Limiting input size (rejecting documents with large datasets)

Chosen approach:
Split large datasets (e.g., >500 line items) into smaller chunks (e.g., ~50 rows per page), render them independently using Puppeteer, and merge the resulting PDFs using a library such as pdf-lib.

Why:

Prevents Puppeteer crashes caused by out-of-memory (OOM) errors during rendering

Ensures predictable and bounded memory usage per rendering task

Improves reliability for edge cases involving highly variable document sizes

Tradeoff accepted:

Additional implementation complexity in splitting and merging PDFs

Slight increase in total processing time due to multiple render cycles and merge overhead

Decision 3: In-Memory Job Metadata Store (Initial Iteration)

Alternatives considered:

Persistent job tracking using PostgreSQL or another durable datastore

Chosen approach:
Use an in-memory store (within the service or Redis) for tracking job status during initial implementation.

Why:

Faster to implement and iterate during early stages

Reduces schema design and database overhead

Sufficient for short-lived jobs in a controlled environment

Tradeoff accepted:

Job state is lost on service restarts, impacting reliability

Not suitable for production scenarios requiring durability, auditability, or long-running job tracking

## 5. AI Usage Log
> Public links of conversations you had with AI.
https://chatgpt.com/share/69bb04c3-717c-8011-9739-c2ecb7127218
The development code is not copyable as it is in my company laptop
I am using a integrated cursor tool for fast development.
I first wrote down the steps
Steps:
1- Push the json into queue
2- use handleBar (input: 1 line item from json, output: html)
3- divide the line items into batches of 100 (max)
4- Use each batch (of <=100) and html template -> generate small pdfs (Using puppetter)
5- Merge small pdfs to generate one large PDF
6- Store in s3 the large pdf
7- Generate link for s3 file
8- Store the link to file

Then one by one I gave it
and also used its follow up msgs to add retries 

## 6. Weaknesses & Future Improvements
> What is the weakest part of your design? If you had 2 more days, what
would you
> improve? What would you change if this needed to support 10x the load?
I believe weakest part of my design (considering from production grade):
- In-memory job store is not durable
- No automatic retry mechanism for failed jobs
- No dead letter Queue (to store the failed jobs (failed more than 3 times maybe))
- Single worker node limits scalability

If I had 2 days: 
First I would switch PostgreSQL db for persistence

And maybe Implement retry with exponential backoff (only after discussing with the team)

maybe write some tests - unit + integration

For Scaling to 10x Load

Horizontally scale workers

Move storage to S3 + CDN

Add API rate limiting (for preventing from misuse)

Auto-scale based on queue depth

## 7. One Thing the Problem Statement Didn't Mention
> What's something important for a production deployment that wasn't
called out in the
> requirements? Why does it matter?
Observability (logging, metrics, alerting)

This is critical because:
- Puppeteer failures are common and hard to debug (After studying few redit posts on this)
- Queue backlog must be monitored
- Memory spikes need visibility (from experience)

## 8. Cost Estimation
Infrastructure

EC2 (t3.large)

~$60/month (Picked from google. May vary depending on different region and other plans)

Redis

$0 (reused existing)

Storage (S3/EBS)

10GB × $0.023 ≈ $2.3/month (Apporximating)

Data Transfer

~30GB/month ≈ $3–5
Total Cost
Component	Cost
EC2	$60
Storage	$3
Bandwidth	$5
Total	~$68/month
Please note this cost analysis is based on what we use in the company as of now
We use INR so I am converting to dollar for better understanding thinking that is the base for Amazon services billing