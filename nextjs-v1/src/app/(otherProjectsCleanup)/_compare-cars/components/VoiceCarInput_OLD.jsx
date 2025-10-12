import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { InvokeLLM } from "@/integrations/Core";
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Play,
  Square,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VoiceCarInput({ onCarData, onCancel }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [processedData, setProcessedData] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    // Check for speech recognition support
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setError(
        "Speech recognition is not supported in this browser. Please use Chrome or Safari.",
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "he-IL"; // Hebrew primary, but will detect other languages

    // Add multiple language support
    if (recognitionRef.current.lang) {
      recognitionRef.current.lang = "he-IL"; // Hebrew
    }

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript((prev) => prev + finalTranscript + interimTranscript);
    };

    recognitionRef.current.onerror = (event) => {
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startListening = async () => {
    try {
      setError("");
      setTranscript("");

      // Request microphone permission and setup audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        setAudioLevel(average);
        animationFrameRef.current =
          requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      setError(
        "Microphone access denied. Please allow microphone access and try again.",
      );
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const processTranscript = async () => {
    if (!transcript.trim()) {
      setError("No speech detected. Please try speaking again.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const response = await InvokeLLM({
        prompt: `You are a car deal analyzer. I will provide you with speech about a car deal, and you need to extract the relevant information and structure it properly.

The user said: "${transcript}"

Please extract and structure the following information from this speech:
- Car name/model/year
- Car price (in NIS if mentioned, or estimate based on context)
- Down payment amount
- Monthly payment amount  
- Loan term in months
- Final/balloon payment
- Fuel type (gasoline/hybrid/electric)  
- Any other relevant details mentioned

If some information is missing, provide reasonable estimates based on typical Israeli car market data. If the speech is in Hebrew, Arabic, or other languages, translate and understand the content appropriately.

Please be smart about understanding colloquial speech, abbreviations, and different ways people might express financial terms.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            car_name: { type: "string" },
            car_price: { type: "number" },
            down_payment: { type: "number" },
            monthly_payment: { type: "number" },
            loan_months: { type: "number" },
            final_payment: { type: "number" },
            fuel_type: {
              type: "string",
              enum: ["gasoline", "hybrid", "electric"],
            },
            fuel_consumption: { type: "number" },
            annual_insurance: { type: "number" },
            registration_cost: { type: "number" },
            annual_tax: { type: "number" },
            depreciation_percentages: {
              type: "array",
              items: { type: "number" },
              minItems: 7,
              maxItems: 7,
            },
            maintenance_costs: {
              type: "array",
              items: { type: "number" },
              minItems: 7,
              maxItems: 7,
            },
            extracted_details: { type: "string" },
            confidence_level: {
              type: "string",
              enum: ["high", "medium", "low"],
            },
          },
        },
      });

      setProcessedData(response);
    } catch (err) {
      setError(
        "Failed to process speech. Please try again or enter details manually.",
      );
      console.error("Speech processing error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const createCarFromVoice = () => {
    if (!processedData) return;

    // Calculate effective rate
    const principal = processedData.car_price - processedData.down_payment;
    let effectiveRate = 0;
    if (principal > 0 && processedData.monthly_payment > 0) {
      // Simple approximation - in real app would use more sophisticated calculation
      const totalPaid =
        processedData.monthly_payment * processedData.loan_months +
        processedData.final_payment;
      const totalInterest = totalPaid - principal;
      effectiveRate =
        (totalInterest / principal) *
        (12 / processedData.loan_months) *
        100;
    }

    const carData = {
      name: processedData.car_name || "Voice Input Car",
      customName: "",
      details: `Voice input: "${transcript}"\n\nExtracted details: ${processedData.extracted_details || ""}`,
      carPrice: processedData.car_price || 200000,
      loanDetails: {
        downPayment: processedData.down_payment || 0,
        months: processedData.loan_months || 48,
        finalPayment: processedData.final_payment || 0,
        monthlyPayment: processedData.monthly_payment || 0,
        totalInterest: 0,
        effectiveRate,
      },
      fuelType: processedData.fuel_type || "hybrid",
      fuelConsumption: processedData.fuel_consumption || 6,
      depreciationPercentage: processedData.depreciation_percentages || [
        18, 14, 12, 10, 8, 7, 6,
      ],
      maintenancePerYear: processedData.maintenance_costs || [
        3000, 3500, 4000, 4500, 5000, 5500, 6000,
      ],
      annualInsurance: processedData.annual_insurance || 6500,
      registrationCost: processedData.registration_cost || 1200,
      annualTax: processedData.annual_tax || 800,
      extendedWarranty: 0,
    };

    onCarData(carData);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Car Deal Input
          </CardTitle>
          <p className="text-primary/90 text-sm">
            Speak naturally about your car deal in any language. I'll
            understand the terms and create the deal for you.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Microphone Button with Visual Feedback */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`h-20 w-20 rounded-full ${isListening ? "hover:bg-destructive/90 animate-pulse bg-red-500" : "bg-blue-500 hover:bg-blue-600"} text-white`}
              >
                {isListening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              {/* Audio Level Indicator */}
              {isListening && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-info w-1 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(4, (audioLevel / 50) * 20)}px`,
                          opacity: audioLevel > i * 20 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-muted-foreground text-center text-sm">
              {isListening
                ? "Listening... Speak now!"
                : "Click to start recording"}
            </p>
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="space-y-3">
              <label className="text-foreground/90 text-sm font-medium">
                What you said:
              </label>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="bg-secondary min-h-[100px]"
                placeholder="Your speech will appear here..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={processTranscript}
                  disabled={isProcessing || !transcript.trim()}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2 h-4 w-4" />
                      Analyze Speech
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTranscript("")}
                  disabled={isProcessing}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Processed Results */}
          {processedData && (
            <div className="space-y-4">
              <div className="bg-background border-border rounded-lg border p-4">
                <h3 className="mb-3 text-lg font-semibold">
                  Extracted Car Deal Information:
                </h3>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <strong>Car:</strong> {processedData.car_name}
                  </div>
                  <div>
                    <strong>Price:</strong> ₪
                    {processedData.car_price?.toLocaleString()}
                  </div>
                  <div>
                    <strong>Down Payment:</strong> ₪
                    {processedData.down_payment?.toLocaleString()}
                  </div>
                  <div>
                    <strong>Monthly Payment:</strong> ₪
                    {processedData.monthly_payment?.toLocaleString()}
                  </div>
                  <div>
                    <strong>Loan Term:</strong> {processedData.loan_months}{" "}
                    months
                  </div>
                  <div>
                    <strong>Fuel Type:</strong> {processedData.fuel_type}
                  </div>
                </div>

                <div
                  className={`mt-3 rounded px-3 py-2 text-sm ${processedData.confidence_level === "high" ? "bg-green-100 text-green-800" : processedData.confidence_level === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                >
                  <strong>Confidence:</strong>{" "}
                  {processedData.confidence_level}
                  {processedData.confidence_level !== "high" &&
                    " - You may want to review and adjust the details"}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={createCarFromVoice}
                  className="bg-success flex-1 hover:bg-green-700"
                >
                  Create Car Deal
                </Button>
                <Button
                  onClick={() => {
                    setProcessedData(null);
                    setTranscript("");
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-info/10 border-info/20">
        <CardContent className="p-4">
          <h4 className="text-info-foreground mb-2 font-semibold">
            💡 How to use voice input:
          </h4>
          <ul className="text-info space-y-1 text-sm">
            <li>
              • Speak clearly about your car deal in Hebrew, English, or
              Arabic
            </li>
            <li>
              • Include details like: car model, price, down payment,
              monthly payment
            </li>
            <li>
              • Example: "I'm looking at a Toyota Camry for 180,000
              shekels, 30,000 down, 2,800 per month for 4 years"
            </li>
            <li>
              • The AI will extract the information and create the deal
              automatically
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
