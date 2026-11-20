// =========================================================================
// PHARMACY MANAGEMENT APP - CLIENT CONFIGURATION
// =========================================================================

/**
 * DEVELOPMENT MACHINE IP ADDRESS:
 *
 * - When testing on an Android Emulator: You can often use '10.0.2.2' or your local IP.
 * - When testing on a PHYSICAL device (via Expo Go): You MUST use your computer's
 *   actual local network IP address.
 *
 * Current Wi-Fi IPv4 Address:
 * 10.154.128.236
 */

const DEV_MACHINE_IP = '192.168.1.13';
const DEV_SERVER_PORT = '5000';

export const CONFIG = {
  USE_MOCK: false,

  API_BASE_URL: `http://${DEV_MACHINE_IP}:${DEV_SERVER_PORT}/api`,

  AUTH_TOKEN_KEY: 'pharmacy_auth_jwt_token',
  AUTH_USER_KEY: 'pharmacy_auth_user_data',
};