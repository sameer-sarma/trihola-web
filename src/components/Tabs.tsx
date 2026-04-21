import React from "react";
import { FaUser, FaShareAlt, FaGift } from "react-icons/fa";

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabData = [
  { label: "Profile", icon: <FaUser /> },
  { label: "Referrals", icon: <FaShareAlt /> },
  { label: "Rewards", icon: <FaGift /> },
];

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        justifyContent: "space-around",
        flexWrap: "wrap",
        marginBottom: "1rem",
        borderBottom: "1px solid #ddd",
        paddingBottom: "0.5rem",
      }}
    >
      {tabData.map((tab) => (
        <button
          key={tab.label}
          onClick={() => onTabChange(tab.label)}
          style={{
            flex: 1,
            minWidth: "100px",
            backgroundColor: activeTab === tab.label ? "#008080" : "#f8f8f8",
            color: activeTab === tab.label ? "#fff" : "#333",
            border: "none",
            borderRadius: "8px",
            padding: "0.6rem 1rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
          }}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
