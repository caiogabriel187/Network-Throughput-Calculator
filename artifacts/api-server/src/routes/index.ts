import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import calculationsRouter from "./calculations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(calculationsRouter);

export default router;
