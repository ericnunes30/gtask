import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/adapters/SocketContextAdapter";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook para escutar eventos WebSocket de usuários e
 * invalidar queries do React Query automaticamente.
 */
export function useUserSocket() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const hasJoined = useRef(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Protege contra múltiplos joins na mesma conexão
    if (hasJoined.current) return;
    hasJoined.current = true;

    // Entrar na room de usuários
    socket.emit("join-users-room");

    const handleUserCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    };

    const handleUserUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    };

    const handleUserDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    };

    socket.on("user.created", handleUserCreated);
    socket.on("user.updated", handleUserUpdated);
    socket.on("user.deleted", handleUserDeleted);

    return () => {
      socket.off("user.created", handleUserCreated);
      socket.off("user.updated", handleUserUpdated);
      socket.off("user.deleted", handleUserDeleted);
      socket.emit("leave-users-room");
      hasJoined.current = false;
    };
  }, [socket, isConnected, queryClient]);

  return { isListening: isConnected };
}
