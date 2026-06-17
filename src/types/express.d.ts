import { IUser } from "../models/UserModel";

// Extend Express Request to include req.user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
