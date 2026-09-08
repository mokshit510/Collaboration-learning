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
        status = validation.status === 'VALID' ? 'PASS' : 'FAIL';
      } else if (field.status) {
        status = field.status === 'VALID' ? 'PASS' : field.status;
      }

      return {
        label: field.label,
        value: field.value,
        confidence: field.confidence ?? 0,
        valid: validation ? validation.status === 'VALID' : field.status === 'VALID',
        status,
        confidenceSource: field.confidenceSource || 'tesseract',
        lowConfidence: field.lowConfidence || false,
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

    const mrzParsed = result.mrz
      ? {
          documentType: result.mrz.documentType ?? '',
          issuingCountry: result.mrz.issuingCountry ?? '',
          holderName: result.mrz.holderName ?? '',
          surname: result.mrz.surname ?? '',
          givenName: result.mrz.givenName ?? '',
          givenNames: result.mrz.givenNames ?? '',
          documentNumber: result.mrz.documentNumber ?? '',
          nationality: result.mrz.nationality ?? '',
          dob: result.mrz.dob ?? '',
          gender: result.mrz.gender ?? '',
          expiryDate: result.mrz.expiryDate ?? '',
          optionalData: result.mrz.optionalData ?? '',
          compositeChecksumValid: result.mrz.compositeChecksumValid ?? false,
          mrzDetected: result.mrz.mrzDetected ?? false,
          mrzComplete: result.mrz.mrzComplete ?? false,
          line1: result.mrz.line1 ?? '',
          line2: result.mrz.line2 ?? '',
          checksumStatus: result.mrz.checksumStatus || {},
          checksumValidation: result.mrz.checksumValidation || {},
          checksumDetails: result.mrz.checksumDetails || {},
          parseWarnings: result.mrz.parseWarnings || [],
        }
      : {
          documentType: '',
          issuingCountry: '',
          holderName: '',
          surname: '',
          givenName: '',
          givenNames: '',
          documentNumber: '',
          nationality: '',
          dob: '',
          gender: '',
          expiryDate: '',
          optionalData: '',
          compositeChecksumValid: false,
          mrzDetected: false,
          mrzComplete: false,
          line1: '',
          line2: '',
          checksumStatus: {},
          checksumValidation: {},
          checksumDetails: {},
          parseWarnings: [],
        };

    return {
      fields,
      mrzParsed,
      mrz: result.mrz,
      mrzValidation: result.mrzValidation,
      rawText: result.text || '',
      averageConfidence,
      qualityStatus,
      confidenceSource: fields[0]?.confidenceSource || 'tesseract',
      vizDetected: result.vizDetected ?? (fields.length > 0),
      vizFields: result.vizFields || fields,
      vizWarnings: result.vizWarnings || [],
      validation: result.validation || [],
      warnings: result.warnings || result.vizWarnings || [],
    };
  }

  static async run(file) {
    const result = await this.processDocument(file);

    return this.transformResult(result);
  }
}

export default OcrService;
