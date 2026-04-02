const StatusBadge = ({ status }) => {
  const isActive = status === "ACTIVE";
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
        isActive 
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
          : 'bg-orange-100 text-orange-700 border border-orange-300'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
      {status}
    </span>
  );
};

export default StatusBadge;
