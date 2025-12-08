package com.example.animai.repository;

import com.example.animai.domain.ConversationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationLogRepository extends JpaRepository<ConversationLog, Long> {

    List<ConversationLog> findByEggIdOrderByCreatedAtAsc(Long eggId);
}
