declare global {
  namespace Express {
    interface Request {
      /** Id del usuario autenticado. Lo define `requireAuth`. */
      userId: string;
    }
  }
}

export {};
