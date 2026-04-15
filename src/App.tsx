/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Play, RefreshCw, AlertCircle, CheckCircle2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WORD_DATA = [
  { text: "RUN", phonetic: "run" },
  { text: "METH", phonetic: "meth" },
  { text: "LY", phonetic: "lie" }, // LY often sounds like 'lee' or 'lie', mapping to 'lie' if it's a name/syllable
  { text: "KEF", phonetic: "keff" },
  { text: "SID", phonetic: "sid" },
  { text: "GEK", phonetic: "geck" },
  { text: "WEX", phonetic: "wex" },
];

export default function App() {
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  
  // Use a ref to track if the "Speak All" process should be cancelled
  const cancelRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSupported(true);
      
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoicesLoaded(true);
        }
      };

      checkVoices();
      window.speechSynthesis.onvoiceschanged = checkVoices;
      
      const interval = setInterval(() => {
        if (window.speechSynthesis.getVoices().length > 0) {
          setVoicesLoaded(true);
          clearInterval(interval);
        }
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const stopAll = useCallback(() => {
    window.speechSynthesis.cancel();
    cancelRef.current = true;
    setIsSpeakingAll(false);
    setActiveWord(null);
    setCurrentIteration(0);
  }, []);

  const speak = useCallback((text: string, phonetic?: string) => {
    if (!speechSupported) return;

    stopAll();
    // Reset cancel ref for single word speak
    cancelRef.current = false;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(phonetic || text);
      utterance.lang = "en-US";
      utterance.rate = 0.85; // Slightly slower for better clarity
      utterance.pitch = 1;

      utterance.onstart = () => setActiveWord(text);
      utterance.onend = () => setActiveWord(null);
      utterance.onerror = (event) => {
        console.error("SpeechSynthesisUtterance error", event);
        setActiveWord(null);
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }, [speechSupported, stopAll]);

  const speakAll = async () => {
    if (!speechSupported) return;
    
    stopAll();
    // Reset cancel ref before starting
    cancelRef.current = false;
    setIsSpeakingAll(true);
    
    for (let i = 0; i < 7; i++) {
      if (cancelRef.current) break;
      setCurrentIteration(i + 1);
      
      for (const item of WORD_DATA) {
        if (cancelRef.current) break;

        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(item.phonetic || item.text);
          utterance.lang = "en-US";
          utterance.rate = 0.95;
          
          utterance.onstart = () => {
            if (cancelRef.current) {
              window.speechSynthesis.cancel();
              resolve();
            } else {
              setActiveWord(item.text);
            }
          };
          
          utterance.onend = () => {
            setActiveWord(null);
            resolve();
          };
          
          utterance.onerror = () => {
            setActiveWord(null);
            resolve();
          };
          
          window.speechSynthesis.speak(utterance);
        });
        
        if (cancelRef.current) break;
        await new Promise(r => setTimeout(r, 200));
      }
      
      if (cancelRef.current) break;
      await new Promise(r => setTimeout(r, 800));
    }
    
    setIsSpeakingAll(false);
    setCurrentIteration(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold text-slate-900 font-display tracking-tight sm:text-5xl mb-4"
          >
            發音練習卡
          </motion.h1>
          
          {speechSupported === false && (
            <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>瀏覽器不支援</AlertTitle>
              <AlertDescription>
                您的瀏覽器不支援語音合成功能，請嘗試使用 Chrome 或 Safari。
              </AlertDescription>
            </Alert>
          )}

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-2xl mx-auto mb-8"
          >
            點擊卡片或按鈕來聆聽單字的發音。
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {!isSpeakingAll ? (
                <Button 
                  onClick={speakAll}
                  disabled={!voicesLoaded}
                  className="rounded-full px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  連續朗讀 7 次 (全體)
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button 
                    disabled
                    className="rounded-full px-8 py-6 text-lg font-bold shadow-lg bg-primary/80"
                  >
                    正在朗讀 (第 {currentIteration}/7 次)
                  </Button>
                  <Button 
                    onClick={stopAll}
                    variant="destructive"
                    className="rounded-full px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Square className="mr-2 h-5 w-5 fill-current" />
                    停止播放
                  </Button>
                </div>
              )}
              
              {!isSpeakingAll && (
                <Button
                  variant="outline"
                  onClick={stopAll}
                  className="rounded-full px-8 py-6 text-lg font-bold border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  <Square className="mr-2 h-5 w-5 fill-current" />
                  停止播放
                </Button>
              )}
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WORD_DATA.map((item, index) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              <Card 
                className={`overflow-hidden border-2 transition-all duration-300 cursor-pointer
                  ${activeWord === item.text 
                    ? "border-primary ring-4 ring-primary/10 shadow-xl" 
                    : "border-transparent hover:border-slate-200 shadow-md hover:shadow-lg"
                  }`}
                onClick={() => speak(item.text, item.phonetic)}
              >
                <CardContent className="p-8 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="mb-6">
                    <AnimatePresence mode="wait">
                      {activeWord === item.text ? (
                        <motion.div
                          key="volume"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="p-4 bg-primary/10 rounded-full"
                        >
                          <Volume2 className="w-8 h-8 text-primary animate-pulse" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          className="p-4 bg-slate-100 rounded-full group-hover:bg-primary/5 transition-colors"
                        >
                          <Play className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <h2 className="text-4xl font-bold font-display tracking-wider text-slate-800 mb-2">
                    {item.text}
                  </h2>
                  
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full px-6 font-medium"
                    >
                      播放發音
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <footer className="mt-16 text-center text-slate-400 text-sm">
          <p>© 2024 Pronunciation Cards • 使用 Web Speech API</p>
        </footer>
      </div>
    </div>
  );
}
