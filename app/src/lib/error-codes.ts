/**
 * Standardized error codes for the entire application.
 * Every server action/API must return one of these codes on failure.
 */
export type AppErrorCode =
  // Auth
  | "UNAUTHENTICATED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "USER_BLOCKED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"

  // General
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "REQUEST_TIMEOUT"
  | "DATABASE_ERROR"
  | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "CREATE_AUCTION_FAILED"
  | "PLACE_BID_FAILED"
  | "CANCEL_AUTOBID_FAILED"
  | "DELETE_SELLER_PRODUCT_FAILED"
  | "UPDATE_PROFILE_FAILED"
  | "CHANGE_PASSWORD_FAILED"
  | "UPDATE_NOTIFICATIONS_FAILED"
  | "MARK_NOTIFICATIONS_FAILED"
  | "DELETE_ACCOUNT_FAILED"
  | "LOGOUT_ALL_DEVICES_FAILED"
  | "SEND_EMAIL_VERIFICATION_FAILED"
  | "VERIFY_EMAIL_FAILED"

  // Auction-specific
  | "AUCTION_NOT_RUNNING"
  | "AUCTION_NOT_FOUND"
  | "AUCTION_ALREADY_FINISHED"
  | "AUCTION_CANCELED"
  | "AUCTION_HAS_BIDS"
  | "BID_TOO_LOW"
  | "PRICE_CHANGED"
  | "CURRENT_PRICE_CHANGED"
  | "SELLER_CANNOT_BID"
  | "INVALID_AUCTION_STATUS"
  | "INVALID_TRANSITION"
  | "CONCURRENT_BID_CONFLICT"
  | "IMAGE_URL_INVALID"
  | "PAYMENT_NOT_ALLOWED"
  | "CANCEL_NOT_ALLOWED"
  | "AUTO_BID_PRICE_EXCEEDS_MAX"
  | "AUTO_BID_MAX_TOO_LOW"
  | "AUTO_BID_NOT_FOUND"

  // Profile / User
  | "USER_NOT_FOUND"
  | "PROFILE_NOT_FOUND"
  | "WRONG_PASSWORD"
  | "INVALID_CURRENT_PASSWORD"
  | "PASSWORD_TOO_WEAK"
  | "PROFILE_UPDATE_FAILED"
  | "EMAIL_UPDATE_FAILED"
  | "UPDATE_EMAIL_FAILED"
  | "EMAIL_ALREADY_VERIFIED"
  | "EMAIL_ALREADY_IN_USE"
  | "TOKEN_EXPIRED_OR_INVALID"
  | "AVATAR_UPDATE_FAILED"
  | "UPDATE_AVATAR_FAILED"
  | "ACCOUNT_DELETE_FAILED"
  | "NOTIFICATION_UPDATE_FAILED"

  // Admin
  | "ADMIN_ACTION_FAILED"
  | "CANNOT_BLOCK_SELF"
  | "CANNOT_BLOCK_ADMIN"
  | "INVALID_USER_ROLE"

  // Realtime / Data freshness
  | "REALTIME_DISCONNECTED"
  | "STALE_DATA"
  | "DUPLICATE_REQUEST"
  | "IDEMPOTENCY_REPLAY";

/**
 * Standardized success response
 */
export type SuccessResult<T> = {
  ok: true;
  /**
   * Backward-compatible alias for existing UI code.
   * New code should prefer `ok`.
   */
  success: true;
  data: T;
  message?: string;
};

/**
 * Standardized error response
 */
export type ErrorResult = {
  ok: false;
  /**
   * Backward-compatible alias for existing UI code.
   * New code should prefer `ok`.
   */
  success: false;
  code: AppErrorCode;
  message: string;
  /**
   * Backward-compatible alias for existing UI code.
   * New code should prefer `message`.
   */
  error: string;
  fieldErrors?: Record<string, string>;
  details?: unknown;
};

/**
 * Standardized action result - all server actions return this shape.
 */
export type LegacySuccessResult<T> = {
  success: true;
  data: T;
  ok?: true;
  message?: string;
};

export type LegacyErrorResult = {
  success: false;
  error: string;
  code?: AppErrorCode;
  ok?: false;
  message?: string;
  fieldErrors?: Record<string, string>;
  details?: unknown;
  data?: unknown;
};

/**
 * Action result supports legacy `success/error` responses while new helpers
 * return the standardized `ok/message` shape. This allows gradual migration
 * without breaking existing UI code.
 */
export type ActionResult<T> = SuccessResult<T> | ErrorResult | LegacySuccessResult<T> | LegacyErrorResult;

/**
 * Helper to create a success result
 */
export function success<T>(data: T, message?: string): SuccessResult<T> {
  return { ok: true, success: true, data, ...(message ? { message } : {}) };
}

/**
 * Helper to create an error result
 */
export function error(
  code: AppErrorCode,
  message: string,
  options?: {
    fieldErrors?: Record<string, string>;
    details?: unknown;
  },
): ErrorResult {
  return {
    ok: false,
    success: false,
    code,
    message,
    error: message,
    ...(options?.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
    ...(options?.details ? { details: options.details } : {}),
  };
}

/**
 * Mapping of AppErrorCode to default user-friendly Vietnamese messages.
 */
export const DEFAULT_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  // Auth
  UNAUTHENTICATED: "Bạn cần đăng nhập để thực hiện thao tác này.",
  AUTH_REQUIRED: "Bạn cần đăng nhập để thực hiện thao tác này.",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  EMAIL_ALREADY_EXISTS: "Email đã được sử dụng bởi người dùng khác.",
  EMAIL_NOT_VERIFIED: "Vui lòng xác minh email trước khi tiếp tục.",
  INVALID_TOKEN: "Token không hợp lệ.",
  TOKEN_EXPIRED: "Token đã hết hạn. Vui lòng thực hiện lại thao tác.",
  USER_BLOCKED: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.",
  SESSION_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  SESSION_REVOKED: "Tài khoản của bạn đã được đăng nhập ở nơi khác. Vui lòng đăng nhập lại.",

  // General
  NOT_FOUND: "Không tìm thấy tài nguyên yêu cầu.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.",
  NETWORK_ERROR: "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
  REQUEST_TIMEOUT: "Máy chủ phản hồi quá lâu. Vui lòng thử lại.",
  DATABASE_ERROR: "Lỗi hệ thống. Vui lòng thử lại sau.",
  SERVER_ERROR: "Lỗi máy chủ. Vui lòng thử lại sau.",
  SERVICE_UNAVAILABLE: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
  RATE_LIMITED: "Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau.",
  CONFLICT: "Dữ liệu đã được cập nhật bởi người dùng khác. Vui lòng tải lại.",
  CREATE_AUCTION_FAILED: "Không thể tạo phiên đấu giá. Vui lòng thử lại.",
  PLACE_BID_FAILED: "Không thể đặt giá. Vui lòng thử lại.",
  CANCEL_AUTOBID_FAILED: "Không thể hủy Auto-bid. Vui lòng thử lại.",
  DELETE_SELLER_PRODUCT_FAILED: "Không thể ẩn sản phẩm. Vui lòng thử lại.",
  UPDATE_PROFILE_FAILED: "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
  CHANGE_PASSWORD_FAILED: "Không thể đổi mật khẩu. Vui lòng thử lại.",
  UPDATE_NOTIFICATIONS_FAILED: "Không thể cập nhật cài đặt thông báo.",
  MARK_NOTIFICATIONS_FAILED: "Không thể cập nhật trạng thái thông báo.",
  DELETE_ACCOUNT_FAILED: "Không thể vô hiệu hóa tài khoản. Vui lòng thử lại.",
  LOGOUT_ALL_DEVICES_FAILED: "Không thể đăng xuất khỏi tất cả thiết bị.",
  SEND_EMAIL_VERIFICATION_FAILED: "Không thể gửi email xác minh. Vui lòng thử lại.",
  VERIFY_EMAIL_FAILED: "Không thể xác minh email. Vui lòng thử lại.",

  // Auction-specific
  AUCTION_NOT_RUNNING: "Phiên đấu giá không ở trạng thái đang chạy.",
  AUCTION_NOT_FOUND: "Phiên đấu giá không tồn tại.",
  AUCTION_ALREADY_FINISHED: "Phiên đấu giá đã kết thúc.",
  AUCTION_CANCELED: "Phiên đấu giá đã bị hủy.",
  AUCTION_HAS_BIDS: "Không thể xóa phiên đang có lượt bid. Bạn có thể kết thúc hoặc ẩn sau khi phiên hoàn tất.",
  BID_TOO_LOW: "Giá đặt phải lớn hơn hoặc bằng giá tối thiểu hiện tại.",
  PRICE_CHANGED: "Giá hiện tại đã thay đổi. Vui lòng tải lại và thử lại.",
  CURRENT_PRICE_CHANGED: "Giá hiện tại đã thay đổi. Vui lòng tải lại và thử lại.",
  SELLER_CANNOT_BID: "Người bán không thể đặt giá cho phiên của mình.",
  INVALID_AUCTION_STATUS: "Trạng thái phiên đấu giá không hợp lệ.",
  INVALID_TRANSITION: "Không thể chuyển đổi trạng thái phiên đấu giá.",
  CONCURRENT_BID_CONFLICT: "Có người dùng khác đã đặt giá cùng lúc. Vui lòng tải lại và thử lại.",
  IMAGE_URL_INVALID: "URL hình ảnh không hợp lệ.",
  PAYMENT_NOT_ALLOWED: "Thanh toán không được phép ở thời điểm này.",
  CANCEL_NOT_ALLOWED: "Không thể hủy thao tác này.",
  AUTO_BID_PRICE_EXCEEDS_MAX: "Giá đặt không thể lớn hơn giá tự động tối đa.",
  AUTO_BID_MAX_TOO_LOW: "Giá tự động tối đa phải lớn hơn giá đặt hiện tại.",
  AUTO_BID_NOT_FOUND: "Không tìm thấy auto-bid để hủy.",

  // Profile / User
  USER_NOT_FOUND: "Không tìm thấy người dùng.",
  PROFILE_NOT_FOUND: "Không tìm thấy hồ sơ người dùng.",
  WRONG_PASSWORD: "Mật khẩu hiện tại không đúng.",
  INVALID_CURRENT_PASSWORD: "Mật khẩu hiện tại không đúng.",
  PASSWORD_TOO_WEAK: "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.",
  PROFILE_UPDATE_FAILED: "Không thể cập nhật hồ sơ. Vui lòng thử lại.",
  EMAIL_UPDATE_FAILED: "Không thể cập nhật email. Vui lòng thử lại.",
  UPDATE_EMAIL_FAILED: "Không thể cập nhật email. Vui lòng thử lại.",
  EMAIL_ALREADY_VERIFIED: "Email đã được xác minh trước đó.",
  EMAIL_ALREADY_IN_USE: "Email đã được sử dụng bởi người dùng khác.",
  TOKEN_EXPIRED_OR_INVALID: "Token không tồn tại hoặc đã hết hạn.",
  AVATAR_UPDATE_FAILED: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
  UPDATE_AVATAR_FAILED: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.",
  ACCOUNT_DELETE_FAILED: "Không thể xóa tài khoản. Vui lòng thử lại.",
  NOTIFICATION_UPDATE_FAILED: "Không thể cập nhật cài đặt thông báo.",

  // Admin
  ADMIN_ACTION_FAILED: "Không thể thực hiện thao tác quản trị.",
  CANNOT_BLOCK_SELF: "Bạn không thể khóa chính mình.",
  CANNOT_BLOCK_ADMIN: "Bạn không thể khóa tài khoản quản trị viên.",
  INVALID_USER_ROLE: "Vai trò người dùng không hợp lệ.",

  // Realtime / Data freshness
  REALTIME_DISCONNECTED: "Mất kết nối realtime. Dữ liệu đang được cập nhật định kỳ.",
  STALE_DATA: "Dữ liệu vừa được cập nhật.",
  DUPLICATE_REQUEST: "Yêu cầu đã được xử lý trước đó. Không thể thực hiện lại.",
  IDEMPOTENCY_REPLAY: "Yêu cầu này đã được ghi nhận. Vui lòng kiểm tra trạng thái mới nhất.",
};

/**
 * Helper to check if an error code indicates the user needs to re-authenticate.
 */
export function isAuthError(code: AppErrorCode): boolean {
  return code === "UNAUTHENTICATED" || code === "SESSION_EXPIRED" || code === "SESSION_REVOKED" || code === "AUTH_REQUIRED";
}

/**
 * Helper to check if an error can be safely retried (read operations).
 */
export function isRetryableError(code: AppErrorCode): boolean {
  switch (code) {
    case "NETWORK_ERROR":
    case "REQUEST_TIMEOUT":
    case "DATABASE_ERROR":
    case "SERVER_ERROR":
    case "SERVICE_UNAVAILABLE":
    case "RATE_LIMITED":
      return true;
    default:
      return false;
  }
}