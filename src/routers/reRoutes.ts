import express from "express";
const router = express.Router();
import multer from 'multer';

const upload = multer();

import * as  reController from '../controllers/reController';

router.post('/rxcui',upload.single('file'), reController.RxCUIExtraction);

export default router;