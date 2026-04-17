# Requirements Document

## Introduction

This feature adds an AI-powered mole analysis pipeline to the "New Scan" section of Pocketderm. When a user uploads a skin lesion image, the system automatically runs a four-step pipeline: lesion classification via Amazon Bedrock (Claude), quantitative feature extraction using computer-vision techniques and the Bedrock vision model, a plain-language medical explanation generation, and an overall risk estimation. Results are displayed in four structured sections on the frontend. All image storage is encrypted and scoped per user; invalid uploads are rejected before reaching any AI service.

---

## Glossary

- **Analysis_Pipeline**: The four-step sequential process that classifies a lesion, extracts features, generates an explanation, and computes a risk score.
- **Bedrock_Client**: The module responsible for invoking Amazon Bedrock API endpoints, including retry logic.
- **Classification_Step**: Pipeline Step 1 — sends the image to the Bedrock vision model and returns a lesion category and confidence score.
- **Feature_Extractor**: Pipeline Step 2 — derives quantitative geometric and visual metrics from the uploaded image.
- **Explanation_Generator**: Pipeline Step 3 — makes a second Bedrock call to produce a plain-language medical explanation referencing ABCDE criteria.
- **Risk_Scorer**: Pipeline Step 4 — combines classification confidence and feature metrics into a risk level and numeric score using a configurable weighting formula.
- **Image_Validator**: The module that validates uploaded files before any pipeline step is invoked.
- **Upload_Component**: The drag-and-drop / file-picker UI element on the "New Scan" page.
- **Results_Display**: The frontend component that renders the four result sections after analysis completes.
- **Risk_Config**: The configuration file that stores the weighting formula used by the Risk_Scorer.
- **S3_Store**: The encrypted, per-user Amazon S3 bucket used to persist uploaded images.
- **Request_Logger**: The module that records request IDs and response times without logging image contents or PII.
- **ABCDE_Criteria**: The dermatological assessment framework: Asymmetry, Border, Color, Diameter, Evolution.
- **Disclaimer**: The fixed text: "This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist."

---

## Requirements

### Requirement 1: Image Upload and Validation

**User Story:** As a patient, I want to upload a photo of my mole, so that the system can analyze it without me having to worry about sending an invalid file.

#### Acceptance Criteria

1. WHEN a user selects or drops a file on the Upload_Component, THE Image_Validator SHALL accept only files with MIME type `image/jpeg` or `image/png`.
2. WHEN an uploaded file exceeds 10 MB, THE Image_Validator SHALL reject the file and display an error message before invoking any pipeline step.
3. WHEN an uploaded file has an unsupported MIME type, THE Image_Validator SHALL reject the file and display an error message before invoking any pipeline step.
4. WHEN an uploaded file is corrupted or cannot be decoded as a valid image, THE Image_Validator SHALL reject the file and display an error message before invoking any pipeline step.
5. IF the Image_Validator rejects a file, THEN THE Analysis_Pipeline SHALL NOT be invoked.
6. WHEN a valid image is accepted, THE Upload_Component SHALL display a preview of the image to the user.

---

### Requirement 2: Secure Image Storage

**User Story:** As a patient, I want my uploaded images stored securely, so that my health data remains private.

#### Acceptance Criteria

1. WHEN a valid image passes validation, THE S3_Store SHALL store the image in an encrypted S3 bucket scoped to the authenticated user's identifier.
2. THE S3_Store SHALL use server-side encryption for all stored objects.
3. THE S3_Store SHALL scope each stored object under a key prefix that includes the user's unique identifier, ensuring no cross-user access.

---

### Requirement 3: Pipeline Step 1 — Lesion Classification

**User Story:** As a patient, I want the system to classify my mole into a standard dermatological category, so that I understand what type of lesion I may have.

#### Acceptance Criteria

1. WHEN a valid image is submitted to the Classification_Step, THE Classification_Step SHALL send the image to the Bedrock vision model (Claude on Bedrock) and return a category label.
2. THE Classification_Step SHALL return one of the following category labels: `common nevus`, `atypical nevus`, `seborrheic keratosis`, `melanoma-suspicious`, or `other`.
3. THE Classification_Step SHALL return a confidence score as a numeric value between 0.0 and 1.0 (inclusive) alongside the category label.
4. IF the Bedrock_Client receives a retryable error response, THEN THE Bedrock_Client SHALL retry the request using exponential backoff with a maximum of 3 attempts before returning a failure.
5. THE Classification_Step SHALL be implemented as an independently callable function with a defined input (image data) and output (category label, confidence score).

---

### Requirement 4: Pipeline Step 2 — Quantitative Feature Extraction

**User Story:** As a patient, I want measurable features extracted from my mole image, so that the analysis is grounded in objective visual data.

#### Acceptance Criteria

1. WHEN an image is submitted to the Feature_Extractor, THE Feature_Extractor SHALL compute a border regularity score as a numeric value between 0.0 and 1.0.
2. WHEN an image is submitted to the Feature_Extractor, THE Feature_Extractor SHALL compute a symmetry score as a numeric value between 0.0 and 1.0.
3. WHEN an image is submitted to the Feature_Extractor, THE Feature_Extractor SHALL compute a color uniformity score as a numeric value between 0.0 and 1.0.
4. WHEN an image is submitted to the Feature_Extractor, THE Feature_Extractor SHALL produce a normalized boundary points array representing the lesion contour.
5. WHEN an image is submitted to the Feature_Extractor and a scale reference is present in the image, THE Feature_Extractor SHALL compute an estimated surface area in square millimeters.
6. WHEN an image is submitted to the Feature_Extractor and no scale reference is present, THE Feature_Extractor SHALL mark the estimated surface area as unavailable.
7. THE Feature_Extractor SHALL use classical computer-vision techniques (such as contour detection and segmentation) for geometric features (border regularity, symmetry, boundary points, surface area).
8. THE Feature_Extractor SHALL use the Bedrock vision model for higher-level visual judgments (color uniformity).
9. THE Feature_Extractor SHALL be implemented as an independently callable function with a defined input (image data) and output (feature metrics object).

---

### Requirement 5: Pipeline Step 3 — Professional Medical Explanation

**User Story:** As a patient, I want a plain-language explanation of my results, so that I can understand what the AI found without needing medical training.

#### Acceptance Criteria

1. WHEN the Explanation_Generator is invoked with classification results and feature metrics, THE Explanation_Generator SHALL make a Bedrock API call and return a plain-language explanation between 120 and 200 words in length.
2. THE Explanation_Generator SHALL reference ABCDE_Criteria (Asymmetry, Border, Color, Diameter, Evolution) in the generated explanation.
3. THE Explanation_Generator SHALL append the Disclaimer as the final sentence of every generated explanation.
4. THE Explanation_Generator SHALL be implemented as an independently callable function with a defined input (classification label, confidence score, feature metrics) and output (explanation text).
5. IF the Bedrock_Client receives a retryable error response during explanation generation, THEN THE Bedrock_Client SHALL retry the request using exponential backoff with a maximum of 3 attempts before returning a failure.

---

### Requirement 6: Pipeline Step 4 — Overall Risk Estimation

**User Story:** As a patient, I want a single overall risk score, so that I can quickly understand the urgency of seeking professional care.

#### Acceptance Criteria

1. WHEN the Risk_Scorer is invoked with a classification confidence score and feature metrics, THE Risk_Scorer SHALL return a risk level of `low`, `moderate`, or `high`.
2. THE Risk_Scorer SHALL return a numeric risk score between 0 and 100 (inclusive).
3. THE Risk_Scorer SHALL derive the risk level and numeric score using the weighting formula defined in the Risk_Config file.
4. THE Risk_Config file SHALL be the single authoritative source for all weighting parameters used by the Risk_Scorer.
5. THE Risk_Scorer SHALL be implemented as an independently callable function with a defined input (confidence score, feature metrics) and output (risk level, numeric score).

---

### Requirement 7: End-to-End Pipeline Orchestration

**User Story:** As a patient, I want the analysis to start automatically after I upload a valid image, so that I don't have to manually trigger each step.

#### Acceptance Criteria

1. WHEN a valid image passes the Image_Validator, THE Analysis_Pipeline SHALL automatically invoke Classification_Step, Feature_Extractor, Explanation_Generator, and Risk_Scorer in sequence.
2. WHEN all four pipeline steps complete successfully, THE Analysis_Pipeline SHALL return a structured result containing: category label, confidence score, feature metrics, explanation text, risk level, and numeric risk score.
3. WHEN a valid image is submitted and all pipeline steps succeed, THE Analysis_Pipeline SHALL return the complete structured result within 15 seconds.
4. THE Analysis_Pipeline SHALL pass the output of each step as input to the next step without requiring user interaction between steps.

---

### Requirement 8: Frontend Loading State

**User Story:** As a patient, I want to see a loading indicator while my image is being analyzed, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline is running, THE Results_Display SHALL show a loading state that indicates analysis is in progress.
2. WHILE the Analysis_Pipeline is running, THE Results_Display SHALL NOT display partial or incomplete results.
3. WHEN the Analysis_Pipeline completes, THE Results_Display SHALL transition from the loading state to the results view without requiring a page reload.

---

### Requirement 9: Results Display

**User Story:** As a patient, I want to see my analysis results organized into clear sections, so that I can easily understand each part of the assessment.

#### Acceptance Criteria

1. WHEN analysis results are available, THE Results_Display SHALL render a Classification section showing the category label and confidence score.
2. WHEN analysis results are available, THE Results_Display SHALL render a Metrics section showing border regularity score, symmetry score, color uniformity score, estimated surface area (or "unavailable"), and the boundary points visualization.
3. WHEN analysis results are available, THE Results_Display SHALL render a Medical Explanation section containing the plain-language explanation text.
4. WHEN analysis results are available, THE Results_Display SHALL render an Overall Risk section showing the risk level (`low`, `moderate`, or `high`) and the numeric risk score.
5. THE Results_Display SHALL render the Disclaimer as a persistently visible element on the results view, independent of the explanation text.

---

### Requirement 10: Disclaimer Propagation

**User Story:** As a patient and as a compliance stakeholder, I want the medical disclaimer to appear in both the backend response and the UI, so that users are never shown AI results without the appropriate caveat.

#### Acceptance Criteria

1. THE Explanation_Generator SHALL include the Disclaimer text in the structured response payload returned by the Analysis_Pipeline.
2. THE Results_Display SHALL render the Disclaimer visibly on the results page at all times while results are shown.
3. THE Disclaimer text SHALL be exactly: "This is an AI-generated assessment and is not a medical diagnosis. Please consult a licensed dermatologist."

---

### Requirement 11: Observability and Privacy

**User Story:** As an operator, I want request IDs and response times logged for every Bedrock call, so that I can monitor performance and debug failures without exposing sensitive data.

#### Acceptance Criteria

1. WHEN the Bedrock_Client completes a request, THE Request_Logger SHALL record the request ID and response time in milliseconds.
2. THE Request_Logger SHALL NOT log image contents in any log entry.
3. THE Request_Logger SHALL NOT log personally identifiable information (PII) in any log entry.
4. WHEN a Bedrock_Client request fails after all retry attempts, THE Request_Logger SHALL log the failure with the request ID and error code, without including image data or PII.
