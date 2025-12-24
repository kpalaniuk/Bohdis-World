import { Calculator } from '@/components/calculator/Calculator';
import { PixelCard } from '@/components/ui/PixelCard';

export default function CalculatorPage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="font-pixel text-foamy-green text-xl md:text-2xl mb-2"
            style={{ textShadow: '3px 3px 0px #2d2d2d' }}
          >
            SCIENTIFIC CALCULATOR
          </h1>
          <p 
            className="font-lcd text-sand-beige text-lg"
            style={{ textShadow: '2px 2px 0px #2d2d2d' }}
          >
            A retro calculator with all the functions you need!
          </p>
        </div>

        {/* Calculator */}
        <Calculator />

        {/* Tips */}
        <PixelCard variant="glass" padding="md" className="mt-8 max-w-2xl mx-auto">
          <h3 className="font-pixel text-ocean-blue text-xs mb-3">TIPS</h3>
          <ul className="font-lcd text-gray-300 text-sm space-y-2">
            <li>• Use keyboard for faster input!</li>
            <li>• Click history items to reuse results</li>
            <li>• Scientific functions need parentheses: sin(45)</li>
            <li>• π and e are special constants</li>
            <li>• xʸ lets you do powers like 2^8 = 256</li>
          </ul>
        </PixelCard>
      </div>
    </div>
  );
}

