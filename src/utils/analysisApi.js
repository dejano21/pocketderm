/**
 * Frontend API client for the mole analysis backend.
 * Sends images to POST /api/analyze and handles errors.
 */

const API_URL = "/api/analyze";
const USER_ID = "demo-user";

/**
 * @param {File} imageFile - User-selected image file
 * @returns {Promise<object>} AnalysisResult from the backend
 * @throws {{ type: string, message: string, failedStep?: string }}
 */
export async function analyzeImage(imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("userId", USER_ID);

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw {
      type: "network",
      message:
        "Unable to connect to the analysis service. Please check your connection and try again.",
    };
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    if (response.status === 400) {
      throw {
        type: "validation",
        message: body.message || "The uploaded file is not valid.",
      };
    }

    if (response.status === 500) {
      const step = body.failedStep || "unknown";
      throw {
        type: "pipeline",
        message: `Analysis failed at the ${step} step. Please try again or upload a different image.`,
        failedStep: step,
      };
    }

    throw {
      type: "server",
      message: "An unexpected error occurred. Please try again.",
    };
  }

  return response.json();
}
