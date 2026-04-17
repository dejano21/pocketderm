# Implementation Plan: AI Mole Analysis Pipeline

## Overview

Implement a modular four-step analysis pipeline for PocketDerm's "New Scan" flow. Each module is independently callable and tested. The pipeline is wired together in `analysisPipeline.js` and surfaced through the existing frontend.

## Tasks

- [x] 1. Set up project structure, config, and shared types
  - Create `risk-config.json` with weights and thresholds as defined in the design
  - Create `requestLogger.js` with `logSuccess` and `logFailure` functions that omit image data and PII
  - Define shared error types: `StepError`, `PipelineError`, `BedrockError`
  - _Requirements: 6.3, 6.4, 11.1, 11.2, 11.3, 11.4_

  - [x] 1.1 Write property test for request logger (Property 10)
    - **Property 10: Log entries contain required fields and no sensitive data**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [x] 2. Implement `imageValidator.js`
  - [x] 2.1 Implement `validateImage(file)` returning a discriminated union `{ valid, file } | { valid, error }`
    - Check MIME type is `image/jpeg` or `image/png`
    - Check `file.size <= 10 * 1024 * 1024`
    - Decode via `createImageBitmap()` to confirm valid image data
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Write property test for image validation (Property 1)
    - **Property 1: Image validation accepts only valid MIME types and sizes**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

  - [x] 2.3 Write unit tests for `imageValidator`
    - Test each rejection condition: wrong MIME, oversized, corrupted
    - Test happy path with valid JPEG and PNG
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Implement `bedrockClient.js`
  - [x] 3.1 Implement `invokeModel({ modelId, body, requestId })` with exponential backoff retry
    - Retry on HTTP 429, 500, 502, 503 with delays of 1 s, 2 s, 4 s (max 3 attempts)
    - Throw immediately on 400, 401, 403
    - Call `logSuccess` / `logFailure` via `requestLogger` on completion
    - _Requirements: 3.4, 5.5, 11.1, 11.4_

  - [-] 3.2 Write property test for retry behavior (Property 4)
    - **Property 4: Bedrock_Client retries exactly up to 3 times on retryable errors**
    - **Validates: Requirements 3.4, 5.5**

  - [~] 3.3 Write unit tests for `bedrockClient`
    - Test non-retryable errors throw immediately
    - Test retry exhaustion throws `BedrockError` with `attempts: 3`
    - _Requirements: 3.4, 5.5_

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `s3Store.js`
  - [x] 5.1 Implement S3 upload with per-user key prefix and server-side encryption
    - Key format: `{userId}/{timestamp}-{filename}`
    - Set SSE header on upload request
    - Return the S3 key on success; throw immediately on failure
    - _Requirements: 2.1, 2.2, 2.3_

  - [~] 5.2 Write property test for S3 key prefix (Property 2)
    - **Property 2: S3 key always contains the user ID prefix**
    - **Validates: Requirements 2.3**

  - [~] 5.3 Write unit tests for `s3Store`
    - Test that upload failure throws before any Bedrock calls
    - Test key format includes userId prefix
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Implement `classificationStep.js`
  - [x] 6.1 Implement `classifyLesion(imageBase64, mediaType)` using `bedrockClient`
    - Construct structured prompt requesting JSON with `category` and `confidence`
    - Validate returned `category` is one of the five allowed labels
    - Validate `confidence` is in [0.0, 1.0]
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [~] 6.2 Write property test for classification output domain (Property 3)
    - **Property 3: Classification output is always in the valid domain**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [~] 6.3 Write unit tests for `classificationStep`
    - Test with mocked Bedrock returning each valid category
    - Test rejection of out-of-domain category or confidence values
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 7. Implement `featureExtractor.js`
  - [x] 7.1 Implement classical CV phase using Canvas API
    - Compute `borderRegularity` score in [0.0, 1.0] via contour analysis
    - Compute `symmetryScore` in [0.0, 1.0] via pixel-fold comparison
    - Produce normalized `boundaryPoints` array with x, y in [0.0, 1.0]
    - Compute `estimatedAreaMm2` when scale reference detected, else `null`
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [x] 7.2 Implement Bedrock phase for color uniformity
    - Call `bedrockClient` to obtain `colorUniformity` score in [0.0, 1.0]
    - _Requirements: 4.3, 4.8_

  - [~] 7.3 Write property test for feature metrics ranges (Property 5)
    - **Property 5: Feature metrics are always in valid ranges**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

  - [~] 7.4 Write unit tests for `featureExtractor`
    - Test boundary conditions for each metric
    - Test `estimatedAreaMm2` is `null` when no scale reference
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `explanationGenerator.js`
  - [x] 9.1 Implement `generateExplanation(classification, features)` using `bedrockClient`
    - Construct prompt including category, confidence, and all feature metrics
    - Instruct model to reference all five ABCDE criteria and append the Disclaimer as the final sentence
    - Validate word count is 120–200; retry once with stricter prompt if out of range
    - Truncate/pad to boundary and log warning if second attempt also fails
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.3_

  - [~] 9.2 Write property test for explanation invariants (Property 6)
    - **Property 6: Generated explanation satisfies word count, ABCDE coverage, and Disclaimer**
    - **Validates: Requirements 5.1, 5.2, 5.3, 10.1, 10.3**

  - [~] 9.3 Write unit tests for `explanationGenerator`
    - Test that Disclaimer is appended as final sentence
    - Test that all five ABCDE terms are present
    - Test word count validation and retry logic
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Implement `riskScorer.js`
  - [x] 10.1 Implement `scoreRisk(confidence, features)` as a pure function
    - Load weights and thresholds from `risk-config.json` at module load time
    - Apply formula: `rawScore = confidence * w_conf + (1 - borderRegularity) * w_border + (1 - symmetryScore) * w_sym + (1 - colorUniformity) * w_color`
    - Map `round(rawScore * 100)` to `low` / `moderate` / `high` using config thresholds
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [~] 10.2 Write property test for risk score domain (Property 7)
    - **Property 7: Risk score and level are always in valid domain**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [~] 10.3 Write unit tests for `riskScorer`
    - Test threshold boundaries: score at 39, 40, 69, 70, 100
    - Test that `level` is consistent with `score` and config thresholds
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Implement `analysisPipeline.js`
  - [x] 11.1 Implement `runPipeline(validatedFile, userId)` orchestrating all four steps in sequence
    - S3 upload → `classifyLesion` → `extractFeatures` → `generateExplanation` → `scoreRisk`
    - Catch `StepError` from each step, log via `requestLogger`, re-throw as `PipelineError` with `step` field
    - Return a complete `PipelineResult` object on success
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [~] 11.2 Write property test for pipeline result completeness (Property 8)
    - **Property 8: Pipeline result contains all required fields**
    - **Validates: Requirements 7.1, 7.2, 7.4**

  - [~] 11.3 Write unit tests for `analysisPipeline`
    - Test that S3 failure aborts pipeline before any Bedrock calls
    - Test that `PipelineError.step` is set correctly for each failing step
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement `resultsDisplay.js` and wire frontend
  - [x] 13.1 Implement `renderResults(pipelineResult)` producing the four result sections
    - Classification section: category label and confidence score
    - Metrics section: border regularity, symmetry, color uniformity, estimated area, boundary visualization
    - Medical Explanation section: explanation text
    - Overall Risk section: risk level and numeric score
    - Disclaimer as a persistently visible element independent of explanation text
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.2, 10.3_

  - [x] 13.2 Implement loading state and error state rendering
    - Show loading indicator while pipeline is running; hide partial results
    - Transition to results view on completion without page reload
    - Show user-friendly error message "Analysis failed during [step]. Please try again." on `PipelineError`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 13.3 Wire `imageValidator`, `analysisPipeline`, and `resultsDisplay` into the existing "New Scan" flow in `app.js`
    - On file select/drop: validate → show preview → run pipeline → render results
    - _Requirements: 1.5, 1.6, 7.1_

  - [~] 13.4 Write property test for results rendering completeness (Property 9)
    - **Property 9: Results_Display renders all four sections and the Disclaimer for any result**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 10.2**

  - [x] 13.5 Write unit tests for `resultsDisplay`
    - Test all four sections render with a minimal mock `PipelineResult`
    - Test Disclaimer is always visible
    - Test loading and error states
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** with a minimum of 100 iterations each
- Each property test file must include a comment: `// Feature: ai-mole-analysis, Property N: <property_text>`
- All Bedrock calls go through `bedrockClient.js` — never call Bedrock directly from step modules
- `riskScorer.js` is a pure function; keep it free of async and side effects
- `requestLogger.js` must never receive image data or user PII as arguments
