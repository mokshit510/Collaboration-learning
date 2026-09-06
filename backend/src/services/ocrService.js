import axios from 'axios';
import FormData from 'form-data';
import config from '../config/env.js';

class OcrService {
  static async processDocument(file) {
    if (!file) {
      throw new Error('No document file provided');
    }

    const form = new FormData();

    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const response = await axios.post(
      `${config.ai.serviceUrl}/ocr`,
      form,
      {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000,
      }
    );

    return response.data;
  }

  static transformResult(result) {
    const validationMap = new Map(
      (result.validation || []).map((item) => [
        item.field,
        item,
      ])
    );

    const fields = (result.fields || []).map((field) => {
      const validation = validationMap.get(field.label);

      let status = 'WARNING';

      if (validation) {
        status =
          validation.status === 'VALID'
            ? 'PASS'
            : 'FAIL';
      }

      return {
        label: field.label,
        value: field.value,
        confidence: field.confidence ?? 0,
        valid: validation?.status === 'VALID',
        status,
      };
    });

    const confidenceValues = fields
      .map((field) => Number(field.confidence))
      .filter((value) => Number.isFinite(value));

    const averageConfidence =
      confidenceValues.length > 0
        ? Math.round(
            confidenceValues.reduce(
              (sum, value) => sum + value,
              0
            ) / confidenceValues.length
          )
        : 0;

    let qualityStatus = 'LOW';

    if (averageConfidence >= 90) {
      qualityStatus = 'OPTIMAL';
    } else if (averageConfidence >= 75) {
      qualityStatus = 'MODERATE';
    }

    return {
      fields,

      mrzParsed: {
        documentType: '',
        issuingCountry: '',
        holderName: '',
        documentNumber: '',
        nationality: '',
        dob: '',
        gender: '',
        expiryDate: '',
        optionalData: '',
        compositeChecksumValid: false,
      },

      rawText: result.text || '',

      averageConfidence,

      qualityStatus,
    };
  }

  static async run(file) {
    const result = await this.processDocument(file);

    return this.transformResult(result);
  }
}

export default OcrService;
