package com.example.AinimAI.repository;

import com.example.aipet.domain.ConversationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationLogRepository extends JpaRepository<ConversationLog, Long> {

    List<ConversationLog> findByEggIdOrderByCreatedAtAsc(Long eggId);
}
