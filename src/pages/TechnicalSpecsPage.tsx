import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ScrambleText } from '../components/ScrambleText';
import { getDetailedCNNAnalysis, DetailedAnalysis } from '../services/eloModelService';

export function TechnicalSpecsPage() {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [analysis, setAnalysis] = useState<DetailedAnalysis | null>(null);
  const [selectedChannel, setSelectedChannel] = useState(0);

  const pieceNames = [
    'White Pawn', 'White Knight', 'White Bishop', 'White Rook', 'White Queen', 'White King',
    'Black Pawn', 'Black Knight', 'Black Bishop', 'Black Rook', 'Black Queen', 'Black King'
  ];

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        const data = await getDetailedCNNAnalysis(fen);
        setAnalysis(data);
      } catch (e) {
        console.error(e);
      }
    };
    runAnalysis();
  }, [fen]);

  return (
    <div className="flex flex-col items-center text-center gap-24 w-full">
      {/* Header */}
      <section className="flex flex-col items-center gap-12 border-b border-black/10 pb-16 w-full">
        <Link to="/diagnostics" className="flex items-center justify-center gap-2 text-black/40 hover:text-indigo-600 transition-colors group w-fit">
          <span className="text-xs uppercase tracking-widest font-bold">Back to Pipeline</span>
        </Link>
        <div className="flex flex-col items-center gap-6 w-full">
          <h1 className="text-5xl font-sans font-bold text-black tracking-tight text-center">Technical Specifications</h1>
          <p className="text-black/60 max-w-2xl text-center text-lg leading-loose">
            Deep dive into the Convolutional Neural Network (CNN) architecture. This page visualizes the tensor transformation from raw board state to Elo estimation.
          </p>
        </div>
      </section>

      {/* Input Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 w-full max-w-5xl">
        <div className="lg:col-span-2 flex flex-col items-center gap-6 w-full">
          <label className="text-sm uppercase tracking-widest text-black/40 font-bold text-center">Input FEN (Board State)</label>
          <input 
            type="text" 
            value={fen}
            onChange={(e) => setFen(e.target.value)}
            className="w-full bg-black/5 border border-black/10 p-6 font-mono text-base focus:outline-none focus:border-indigo-600 transition-colors text-center"
          />
        </div>
        <div className="p-10 flex flex-col justify-center items-center text-center gap-4 border border-black/20 bg-white">
          <span className="text-sm uppercase tracking-widest text-black/40 font-bold">Current Prediction</span>
          <span className="text-6xl font-mono text-indigo-600">{analysis?.prediction.toFixed(0) || '---'}</span>
          <span className="text-xs uppercase tracking-widest text-black/20 font-bold">Estimated Elo</span>
        </div>
      </section>

      {/* Tensor Visualization */}
      <section className="flex flex-col items-center gap-16 w-full">
        <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
          <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Input Tensor [8x8x12]" /></h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 w-full max-w-5xl">
          <div className="flex flex-col items-center text-center gap-10 w-full">
            <p className="text-base text-black/70 leading-loose text-center">
              The board is encoded into 12 binary channels. Each channel represents a specific piece type. 
              Below, you can toggle through the channels to see what the CNN "sees" for each piece.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-md">
              {pieceNames.map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedChannel(idx)}
                  className={`px-3 py-2 text-[10px] uppercase tracking-tighter font-bold border transition-all ${
                    selectedChannel === idx 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'bg-white border-black/10 text-black/40 hover:border-black/30'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="grid grid-cols-8 border border-black/20 bg-white shadow-2xl">
              {analysis?.inputTensor.map((row, rIdx) => (
                row.map((col, cIdx) => {
                  const isActive = col[selectedChannel] === 1;
                  const isDark = (rIdx + cIdx) % 2 === 1;
                  return (
                    <div 
                      key={`${rIdx}-${cIdx}`}
                      className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-colors ${
                        isActive 
                          ? 'bg-indigo-600 text-white' 
                          : isDark ? 'bg-black/5' : 'bg-white'
                      }`}
                    >
                      {isActive && <div className="w-4 h-4 rounded-full bg-white animate-pulse" />}
                    </div>
                  );
                })
              ))}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold">
              Visualizing: {pieceNames[selectedChannel]} Channel
            </span>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="flex flex-col items-center gap-16 w-full mt-12">
        <div className="flex items-center justify-center gap-4 border-b border-black/10 pb-8 group w-full">
          <h2 className="text-2xl uppercase tracking-widest font-bold text-indigo-600 text-center"><ScrambleText text="Layer Activations" /></h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          {analysis?.layers.map((layer, idx) => (
            <div key={idx} className="p-8 flex flex-col items-center text-center gap-6 border border-black/20 bg-white">
              <div className="flex flex-col items-center gap-1 w-full">
                <span className="text-[10px] uppercase tracking-widest text-black/40 font-bold text-center">Layer 0{idx + 1}</span>
                <span className="text-[10px] font-mono text-indigo-600 text-center">[{layer.shape.join(', ')}]</span>
              </div>
              <h3 className="text-sm font-bold text-black text-center">{layer.name}</h3>
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {layer.data.map((val, vIdx) => (
                  <div 
                    key={vIdx} 
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: `rgba(79, 70, 229, ${Math.min(1, Math.abs(val))})` }}
                  />
                ))}
              </div>
              <p className="text-[9px] text-black/40 font-mono mt-2">
                Showing first 100 neurons...
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Implementation Guide */}
      <section className="flex flex-col items-center gap-16 bg-indigo-600 text-white p-16 md:p-24 w-full text-center mt-12">
        <div className="flex items-center justify-center gap-4 border-b border-white/20 pb-8 w-full">
          <h2 className="text-3xl uppercase tracking-widest font-bold text-center">How to implement your own</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl">
          <div className="flex flex-col items-center gap-8">
            <h3 className="text-xl font-bold text-center">1. Train in Python</h3>
            <p className="text-white/80 text-base leading-loose text-center">
              Use PyTorch or TensorFlow to train a model on PGN data. Your input should be an 8x8x12 tensor. 
              Once trained, save your model.
            </p>
            <div className="bg-black/20 p-6 rounded font-mono text-sm text-center w-full">
              model.save('chess_elo_model.h5')
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <h3 className="text-xl font-bold text-center">2. Convert to TF.js</h3>
            <p className="text-white/80 text-base leading-loose text-center">
              Install the tensorflowjs_converter and run it on your saved model. This generates a <code className="bg-white/10 px-1">model.json</code> and binary weight files.
            </p>
            <div className="bg-black/20 p-6 rounded font-mono text-sm text-center w-full">
              tensorflowjs_converter --input_format=keras chess_elo_model.h5 ./web_model
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <h3 className="text-xl font-bold text-center">3. Load in this App</h3>
            <p className="text-white/80 text-base leading-loose text-center">
              In <code className="bg-white/10 px-1">eloModelService.ts</code>, replace the manual weight calculation with:
            </p>
            <div className="bg-black/20 p-6 rounded font-mono text-sm text-center w-full">
              const model = await tf.loadLayersModel('/path/to/model.json');<br/>
              const prediction = model.predict(inputTensor);
            </div>
          </div>

          <div className="flex flex-col items-center gap-8">
            <h3 className="text-xl font-bold text-center">4. Hot-Swap Weights</h3>
            <p className="text-white/80 text-base leading-loose text-center">
              If you just want to update weights without changing the architecture, you can modify the <code className="bg-white/10 px-1">CNN_WEIGHTS</code> constant in the service file.
            </p>
            <Link to="/diagnostics" className="mt-6 flex items-center justify-center gap-2 text-white font-bold uppercase tracking-widest text-sm hover:underline text-center">
              Return to Analysis
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
