// =========================================================================
// PHARMACY MANAGEMENT APP - CLIENT CONFIGURATION
// =========================================================================

/**
 * DEVELOPMENT MACHINE IP ADDRESS:
 * 
 * - When testing on an Android Emulator: You can often use '10.0.2.2' or your local IP.
 * - When testing on a PHYSICAL device (via Expo Go): You MUST use your computer's 
 *   actual local network IP address (e.g. '192.168.1.100'). Both the computer and the 
 *   phone must be on the same Wi-Fi network.
 * 
 * To find your local IP:
 * - Windows: Open command prompt and type 'ipconfig' (look for IPv4 Address under Wi-Fi/Ethernet).
 * - macOS: Open Terminal and type 'ipconfig getifaddr en0'.
 */
const DEV_MACHINE_IP = '10.156.93.236';
const DEV_SERVER_PORT = '5000';

export const CONFIG = {
  // Toggle to switch between Phase 1 Mock mode and Phase 2 Live Backend API mode
  // During Phase D, this is set to false so auth-context uses the real API.
  USE_MOCK: false,

  // Base API address
  API_BASE_URL: `http://${DEV_MACHINE_IP}:${DEV_SERVER_PORT}/api`,

  // SecureStore Key Names
  AUTH_TOKEN_KEY: 'pharmacy_auth_jwt_token',
  AUTH_USER_KEY: 'pharmacy_auth_user_data',
};
