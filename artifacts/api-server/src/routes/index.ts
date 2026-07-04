import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import messagesRouter from "./messages";
import chatsRouter from "./chats";
import filesRouter from "./files";
import contactsRouter from "./contacts";
import activityLogRouter from "./activity-log";
import stickersRouter from "./stickers";
import foldersRouter from "./folders";
import callsRouter from "./calls";
import numbersRouter from "./numbers";
import starsRouter from "./stars";
import premiumRouter from "./premium";
import anonInboxRouter from "./anon-inbox";
import { authRateLimit, messageRateLimit, fileUploadRateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRateLimit, authRouter);
router.use(numbersRouter);
router.use(usersRouter);
router.use(messageRateLimit, messagesRouter);
router.use(chatsRouter);
router.use(fileUploadRateLimit, filesRouter);
router.use(contactsRouter);
router.use(activityLogRouter);
router.use(stickersRouter);
router.use(foldersRouter);
router.use(callsRouter);
router.use(starsRouter);
router.use(premiumRouter);
router.use(anonInboxRouter);

export default router;
