import BackendNfcService from '../services/nfcService.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class NfcController {
  static verify(req, res) {
    try {
      const nfcResult = BackendNfcService.verifyNfcCredential(req.body || {});
      // Return both wrapped format and spread for maximum Android reader compatibility
      return res.status(200).json({
        success: true,
        message: 'NFC credential processed successfully',
        data: nfcResult,
        ...nfcResult,
      });
    } catch (err) {
      return sendError(res, 'Failed to process NFC verification', 500, err.message);
    }
  }

  static getLatest(req, res) {
    try {
      const sessionId = req.query.sessionId || req.params.sessionId;
      const nfcResult = BackendNfcService.getLatest(sessionId);
      if (!nfcResult) {
        return sendSuccess(res, null, 'No NFC data recorded for session yet');
      }
      return sendSuccess(res, nfcResult, 'Latest NFC result retrieved');
    } catch (err) {
      return sendError(res, 'Failed to get latest NFC result', 500, err.message);
    }
  }
}

export default NfcController;
