import React, { useState } from "react";
import useAuth from "@/hooks/useAuth";
import useUserStore from "@/stores/userStore";
import { Button, toast, Avatar } from "@heroui/react";
import { FiLogOut, FiX, FiShield, FiAlertTriangle } from "react-icons/fi";
import { AppModal } from "../shared/AppModal";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
};

const LogoutDialog: React.FC<Props> = ({ isOpen, onOpenChange }) => {
  const { signout } = useAuth();
  const userProfile = useUserStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await signout();
      onOpenChange();
    } catch (error: any) {
      toast.danger("Error", {
        description: "There was an issue logging out. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onOpenChange}
      icon={<FiLogOut className="text-warning" size={20} />}
      title="Confirm Logout"
      subtitle="Are you sure you want to sign out?"
      size="lg"
    >
      <div className="space-y-6 w-full h-full flex flex-col text-black">
        <div className="py-6">
          <div className="space-y-6">
            {/* User Profile Display */}
            {userProfile && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <Avatar size="lg" className="w-16 h-16">
                    <Avatar.Fallback className="font-bold text-3xl">
                      {userProfile.first_name.charAt(0)}
                      {userProfile.last_name.charAt(0)}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {userProfile.first_name} {userProfile.last_name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {userProfile.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Message */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="text-yellow-500 mt-0.5" size={20} />
                <div>
                  <h3 className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                    You're about to sign out
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                    You'll need to enter your credentials again to access your
                    account.
                  </p>
                </div>
              </div>
            </div>

            {/* What happens when you log out */}

            {/* Security Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiShield className="text-blue-500 mt-0.5" size={16} />
                <div>
                  <h4 className="text-blue-800 dark:text-blue-200 font-medium text-sm mb-1">
                    Security Tip
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Always log out when using shared or public computers to keep
                    your account secure.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-end gap-2 pb-8">
          <Button
            variant="danger-soft"
            type="button"
            onPress={onOpenChange}
            className="font-medium w-full"
          >
            <FiX size={16} />
            <span>Cancel</span>
          </Button>
          <Button
            size="lg"
            onPress={handleLogout}
            isPending={isLoading}
            className="font-medium w-full"
          >
            {!isLoading && <FiLogOut size={16} />}
            {isLoading ? "Signing Out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </AppModal>
  );
};

export default LogoutDialog;
