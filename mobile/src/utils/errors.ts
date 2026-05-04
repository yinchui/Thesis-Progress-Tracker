export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function handleError(error: Error): string {
  if (error instanceof NetworkError) {
    return '网络连接失败，请检查网络设置';
  } else if (error instanceof AuthError) {
    return '用户名或密码错误';
  } else if (error instanceof NotFoundError) {
    return '数据文件不存在，请检查路径';
  } else {
    return '发生未知错误，请稍后重试';
  }
}
