import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 탭 컨텍스트 타입
 */
interface TabContextProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 탭 컨텍스트
 */
const TabContext = React.createContext<TabContextProps | undefined>(undefined);

/**
 * 탭 컨텍스트 훅
 */
function useTabContext() {
  const context = React.useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within a Tabs component");
  }
  return context;
}

/**
 * 탭 컴포넌트 props
 */
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * 탭 컨테이너 컴포넌트
 */
function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  // 외부 제어 또는 내부 상태 사용
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleValueChange = React.useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    },
    [onValueChange]
  );

  return (
    <TabContext.Provider
      value={{ value: currentValue, onChange: handleValueChange }}
    >
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabContext.Provider>
  );
}

/**
 * 탭 목록 컴포넌트 props
 */
interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 탭 목록 컴포넌트
 */
function TabsList({ children, className, ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex w-full items-center justify-center rounded-lg bg-gray-100 p-1",
        className
      )}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * 탭 트리거 컴포넌트 props
 */
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * 탭 트리거 컴포넌트
 */
function TabsTrigger({
  value,
  children,
  className,
  disabled = false,
  ...props
}: TabsTriggerProps) {
  const { value: selectedValue, onChange } = useTabContext();
  const isSelected = selectedValue === value;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      aria-controls={`tabpanel-${value}`}
      data-state={isSelected ? "active" : "inactive"}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected
          ? "bg-white text-blue-700 shadow-sm"
          : "text-gray-600 hover:text-gray-900",
        className
      )}
      onClick={() => onChange(value)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * 탭 컨텐츠 컴포넌트 props
 */
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * 탭 컨텐츠 컴포넌트
 */
function TabsContent({
  value,
  children,
  className,
  ...props
}: TabsContentProps) {
  const { value: selectedValue } = useTabContext();
  const isSelected = selectedValue === value;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      data-state={isSelected ? "active" : "inactive"}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent }; 