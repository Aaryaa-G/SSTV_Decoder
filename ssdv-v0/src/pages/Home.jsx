import React from 'react';
import { Satellite, Radio, Download, Zap, Globe } from 'lucide-react';

const Home = () => {
  const features = [
    {
      icon: <Satellite className="w-8 h-8 text-blue-400" />,
      title: ' Decoding',
      description: 'Decode SSTV images from live satellite transmissions instantly.',
    },
    {
      icon: <Download className="w-8 h-8 text-purple-400" />,
      title: 'Download Images',
      description: 'Save decoded images directly to your device for offline use.',
    },
    {
      icon: <Globe className="w-8 h-8 text-green-400" />,
      title: 'Global Coverage',
      description: 'Track signals from multiple satellites across the globe.',
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: 'High Success Rate',
      description: 'Optimized decoding algorithms for maximum image recovery.',
    },
    {
      icon: <Radio className="w-8 h-8 text-pink-400" />,
      title: 'Customizable Alerts',
      description: 'Receive notifications when new images are available.',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Animated stars */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-50 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 2 + 2}s`,
            }}
          />
        ))}
      </div>

      {/* Nebula effect */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-transparent to-blue-500/5" />

      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
           Slow Scan Television Decoder
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
          Decode satellite SSTV transmissions and explore cosmic images from around the world.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-transform duration-300"
            >
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-300 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
