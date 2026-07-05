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
import anonInboxRouter from "./anon-inbox";
import pushRouter from "./push";
import pollsRouter from "./polls";
import linksRouter from "./links";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(numbersRouter);
router.use(usersRouter);
router.use(messagesRouter);
router.use(chatsRouter);
router.use(filesRouter);
router.use(contactsRouter);
router.use(activityLogRouter);
router.use(stickersRouter);
router.use(foldersRouter);
router.use(callsRouter);
router.use(anonInboxRouter);
router.use(pushRouter);
router.use(pollsRouter);
router.use(linksRouter);

export default router;
