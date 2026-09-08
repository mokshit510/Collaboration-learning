import React, { useState } from 'react';
import {
  Smartphone,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { MobileApiService, type SessionData } from '../services/api';

interface NfcScreenProps {
  session: SessionData;
  onNfcComplete?: () => void;
}

interface NfcCredential {
  documentId?: string;
  name?: string;
  dob?: string;
  nationality?: string;
  expiry?: string;
  issuerId?: string;
  issuer?: string;
  version?: string;
  timestamp?: string;
  integrityHash?: string;
  signature?: string;
  [key: string]: unknown;
}

export const NfcScreen: React.FC<NfcScreenProps> = ({
  session,
  onNfcComplete,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nfcFeedback, setNfcFeedback] = useState<any | null>(
    session.nfcResult || null
  );
  const [scanMessage, setScanMessage] = useState('');

  const doc = session.document;

  const docNumber = doc?.documentNumber || 'UNKNOWN';
  const holderName = doc?.holderName || 'UNKNOWN';
  const docDob = doc?.dob || 'UNKNOWN';
  const nationality = doc?.nationality || 'UNKNOWN';
  const expiry = doc?.expiryDate || 'UNKNOWN';

  /**
   * Parse the actual text stored inside the NFC NDEF record.
   *
   * Supported formats:
   *
   * JSON:
   * {
   *   "documentId": "P1234567",
   *   "name": "RAHUL SHARMA",
   *   "dob": "2001-05-12",
   *   "nationality": "IND",
   *   "expiry": "2031-05-11",
   *   "issuerId": "IND",
   *   "version": "1"
   * }
   *
   * OR:
   *
   * PRAMAAN|P1234567|RAHUL SHARMA|2001-05-12|IND|2031-05-11|IND|1
   */
  const parseNfcPayload = (text: string): NfcCredential => {
    const trimmed = text.trim();

    if (!trimmed) {
      throw new Error('NFC tag contains an empty payload.');
    }

    // JSON payload
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid NFC JSON object.');
        }

        return parsed;
      } catch {
        throw new Error('NFC payload contains invalid JSON.');
      }
    }

    // PRAMAAN pipe-separated payload
    const parts = trimmed.split('|');

    if (parts[0]?.toUpperCase() === 'PRAMAAN') {
      if (parts.length < 8) {
        throw new Error(
          'Invalid PRAMAAN NFC payload. Expected at least 8 fields.'
        );
      }

      return {
        documentId: parts[1],
        name: parts[2],
        dob: parts[3],
        nationality: parts[4],
        expiry: parts[5],
        issuerId: parts[6],
        version: parts[7],
      };
    }

    // Unknown raw payload.
    // We still return it so the backend can decide how to handle it.
    return {
      rawPayload: trimmed,
    };
  };

  /**
   * Send the ACTUAL credential read from NFC.
   */
  const sendActualNfcCredential = async (
    credential: NfcCredential,
    hardware?: any
  ) => {
    setSubmitting(true);
    setScanMessage('Sending NFC credential to PRAMAAN...');

    try {
      const result = await MobileApiService.verifyNfc({
        sessionId: session.sessionId,

        // ACTUAL NFC DATA
        nfcData: {
          ...credential,
          hardware,
        },

        // OCR / printed document data
        printedData: doc || undefined,
      });

      setNfcFeedback(result);

      setScanMessage(
        result?.status === 'PASS'
          ? 'NFC credential matched the document.'
          : 'NFC credential was received but a mismatch requires review.'
      );

      onNfcComplete?.();
    } catch (err: any) {
      setScanMessage(
        `Failed to verify NFC credential: ${
          err?.message || 'Unknown error'
        }`
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * REAL WEB NFC SCANNER
   */
  const handleScanWebNfc = async () => {
    if (!('NDEFReader' in window)) {
      setScanMessage(
        'Web NFC is not available on this browser/device. Use Chrome on a compatible Android phone.'
      );
      return;
    }

    try {
      setIsScanning(true);
      setNfcFeedback(null);

      setScanMessage(
        'Ready. Hold the phone near your NFC tag...'
      );

      const NDEFReaderClass = (window as any).NDEFReader;

      const ndef = new NDEFReaderClass();

      await ndef.scan();

      setScanMessage(
        'NFC reader active. Bring the physical NFC tag close to the phone.'
      );

      ndef.onreading = async (event: any) => {
        try {
          setScanMessage('NFC tag detected. Reading actual NDEF data...');

          const records = event?.message?.records || [];

          if (!records.length) {
            throw new Error(
              'NFC tag detected, but no NDEF records were found.'
            );
          }

          const decoder = new TextDecoder();

          const decodedRecords: string[] = [];

          for (const record of records) {
            try {
              const text = decoder.decode(record.data);

              if (text.trim()) {
                decodedRecords.push(text.trim());
              }
            } catch {
              console.warn('Unable to decode NFC record:', record);
            }
          }

          if (!decodedRecords.length) {
            throw new Error(
              'NFC record was found but no readable text payload was detected.'
            );
          }

          /**
           * For now we use the first readable NDEF record.
           */
          const rawPayload = decodedRecords[0];

          console.log('REAL NFC PAYLOAD:', rawPayload);

          setScanMessage(
            `NFC data received. Parsing credential...`
          );

          const credential = parseNfcPayload(rawPayload);

          /**
           * Send actual NFC data.
           */
          await sendActualNfcCredential(credential, {
            serialNumber: event?.serialNumber || null,
            recordCount: records.length,
            rawPayload,
          });

          setIsScanning(false);
        } catch (err: any) {
          console.error('NFC payload processing error:', err);

          setScanMessage(
            err?.message ||
              'Could not read the NFC credential payload.'
          );

          setIsScanning(false);
        }
      };

      ndef.onreadingerror = () => {
        setScanMessage(
          'NFC read error. Move the phone slowly around the NFC tag and try again.'
        );

        setIsScanning(false);
      };
    } catch (err: any) {
      console.error('Web NFC error:', err);

      setIsScanning(false);

      setScanMessage(
        `NFC Scan Error: ${
          err?.message ||
          'Permission denied, NFC disabled, or browser does not support Web NFC.'
        }`
      );
    }
  };

  return (
    <div className="bg-[#111C44] border border-blue-500/30 rounded-2xl p-5 shadow-xl space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
            <Radio className="w-4 h-4 animate-radar" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Stage 3 Gate</span>
              <span className="text-xs text-blue-400 font-semibold">
                • NFC Required
              </span>
            </h3>

            <p className="text-[10.5px] text-slate-400">
              Pipeline paused awaiting NFC credential
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
          Active Gate
        </span>
      </div>

      {/* Document Context */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-1">

        <div className="flex items-center justify-between text-slate-400 text-[10.5px]">
          <span>VERIFYING HOLDER</span>

          <span className="font-mono text-slate-300">
            {docNumber}
          </span>
        </div>

        <div className="text-white font-bold text-sm tracking-wide">
          {holderName}
        </div>

        <div className="flex items-center gap-3 text-[10.5px] text-slate-400 pt-0.5">
          <span>
            DOB:{' '}
            <strong className="text-slate-200">
              {docDob}
            </strong>
          </span>

          <span>
            EXP:{' '}
            <strong className="text-slate-200">
              {expiry}
            </strong>
          </span>

          <span>
            NAT:{' '}
            <strong className="text-slate-200">
              {nationality}
            </strong>
          </span>
        </div>
      </div>

      {/* Result */}
      {nfcFeedback ? (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-3">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <CheckCircle2 className="w-5 h-5 text-emerald-400" />

              <div>
                <div className="text-xs font-bold text-white">
                  NFC Read{' '}
                  {nfcFeedback.readStatus || 'SUCCESS'}
                </div>

                <div className="text-[10px] text-emerald-400">
                  Prototype NFC credential received
                </div>
              </div>

            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                nfcFeedback.status === 'PASS'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {nfcFeedback.status === 'PASS'
                ? 'MATCH'
                : 'REVIEW'}
            </span>

          </div>

          <p className="text-[11px] text-slate-300 bg-black/40 p-2.5 rounded-lg border border-slate-800">
            {nfcFeedback.explanation ||
              'NFC credential processed.'}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">

            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Transmitted to Desktop
            </span>

            <button
              type="button"
              onClick={() => {
                setNfcFeedback(null);
                setScanMessage('');
              }}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline"
            >
              Scan Again
            </button>

          </div>

        </div>
      ) : (

        /* NFC Scanner */
        <div className="space-y-3">

          {typeof window !== 'undefined' &&
            'NDEFReader' in window ? (

            <button
              type="button"
              onClick={handleScanWebNfc}
              disabled={isScanning || submitting}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >

              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />

                  <span>
                    Scanning Physical NFC Tag...
                  </span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />

                  <span>
                    Scan Physical NFC Tag
                  </span>
                </>
              )}

            </button>

          ) : (

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">

              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                Web NFC Not Available
              </div>

              <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                Open this page using a compatible Android browser
                with NFC support. Web NFC also requires a secure
                context for normal browser operation.
              </p>

            </div>

          )}

          {scanMessage && (
            <div className="p-3 rounded-lg bg-slate-900 border border-blue-500/40 text-[11px] text-blue-300 leading-relaxed">
              {scanMessage}
            </div>
          )}

          <div className="text-[10.5px] text-slate-400 text-center leading-relaxed">
            Hold your Android phone near the physical NFC tag.
            PRAMAAN will read the NDEF payload stored on the tag
            and send the decoded credential to the backend.
          </div>

        </div>
      )}

    </div>
  );
};