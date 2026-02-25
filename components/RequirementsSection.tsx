"use client";

interface RequirementsSectionProps {
  title: string;
  requirements: string[];
  setRequirements: (requirements: string[]) => void;
  placeholder: string;
  addButtonLabel?: string;
}

export default function RequirementsSection({
  title,
  requirements,
  setRequirements,
  placeholder,
  addButtonLabel = "+ Add Requirement",
}: RequirementsSectionProps) {
  const handleChange = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const handleAdd = () => {
    setRequirements([...requirements, ""]);
  };

  const handleRemove = (index: number) => {
    if (requirements.length > 1) {
      const newRequirements = requirements.filter((_, i) => i !== index);
      setRequirements(newRequirements);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/20 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:shadow-2xl dark:border-purple-800 dark:from-gray-800 dark:via-purple-900/15 dark:to-indigo-900/15">
      <h2 className="mb-6 text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-400 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-300 dark:to-pink-400">
        {title}
      </h2>
      
      <div className="space-y-4">
        {requirements.map((req, index) => (
          <div key={index} className="flex gap-3">
            <input
              type="text"
              value={req}
              onChange={(e) => handleChange(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 rounded-xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm px-5 py-3 text-base text-gray-900 placeholder-gray-400 shadow-md transition-all duration-200 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-purple-300"
            />
            {requirements.length > 1 && (
              <button
                onClick={() => handleRemove(index)}
                className="rounded-xl border-2 border-red-300 bg-gradient-to-r from-red-50 to-pink-50 px-5 py-3 font-medium text-red-700 shadow-md transition-all duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 hover:shadow-lg dark:border-red-800 dark:from-red-900/20 dark:to-pink-900/20 dark:text-red-400 dark:hover:from-red-900/30 dark:hover:to-pink-900/30"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="mt-6 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-indigo-50 via-purple-50 to-purple-50 px-6 py-3 font-semibold text-purple-700 shadow-md transition-all duration-200 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-100 hover:via-purple-100 hover:to-purple-100 hover:shadow-lg dark:border-purple-700 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-purple-900/20 dark:text-purple-300 dark:hover:from-indigo-900/30 dark:hover:via-purple-900/30 dark:hover:to-purple-900/30"
      >
        {addButtonLabel}
      </button>
    </div>
  );
}