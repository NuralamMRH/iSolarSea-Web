import { motion } from "framer-motion";

interface SummaryCardProps {
  label: string;
  value: number;
  color: string;
  textColor: string;
}

export default function SummaryCard({
  label,
  value,
  color,
  textColor,
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-xl px-2 md:px-4 lg:px-6 xl:px-10 py-3 md:py-4 lg:py-6 flex flex-col items-center justify-center w-full md:w-auto bg-gradient-to-br ${color} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}
    >
      <div
        className={`font-bold text-xs md:text-sm lg:text-base mb-1 md:mb-2 uppercase ${textColor} text-center leading-tight`}
      >
        {label}
      </div>
      <div
        className={`text-sm md:text-lg lg:text-xl xl:text-2xl font-bold ${textColor} text-center leading-tight`}
      >
        {value.toLocaleString()} VND
      </div>
    </motion.div>
  );
}
